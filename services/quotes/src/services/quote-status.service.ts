import { Injectable } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';
import { BusinessLogicException, assertValidTransition } from '@nestlancer/common';
import { AcceptQuoteDto } from '../dto/accept-quote.dto';
import { DeclineQuoteDto } from '../dto/decline-quote.dto';
import { RequestQuoteChangesDto } from '../dto/request-quote-changes.dto';
import { ProjectsProvisionerService } from './projects-provisioner.service';

@Injectable()
export class QuoteStatusService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly projectsProvisioner: ProjectsProvisionerService,
  ) {}

  async acceptQuote(userId: string, quoteId: string, dto: AcceptQuoteDto) {
    const quote = await this.prismaWrite.quote.findFirst({
      where: { id: quoteId, userId },
    });

    if (!quote) throw new BusinessLogicException('Quote not found', 'QUOTE_001');

    if (!dto.acceptTerms) {
      throw new BusinessLogicException(
        'You must accept the service agreement to proceed',
        'QUOTE_007',
      );
    }

    const signatureName = dto.signatureName?.trim();
    if (!signatureName) {
      throw new BusinessLogicException('Legal signature name is required', 'QUOTE_008');
    }

    if (['ACCEPTED', 'DECLINED'].includes(quote.status)) {
      throw new BusinessLogicException('Quote already accepted or declined', 'QUOTE_003');
    }

    if (new Date(quote.validUntil) < new Date()) {
      throw new BusinessLogicException('Quote expired', 'QUOTE_004');
    }

    if (!['SENT', 'VIEWED'].includes(quote.status)) {
      throw new BusinessLogicException('Invalid quote status', 'QUOTE_005');
    }

    assertValidTransition('QUOTE', quote.status, 'ACCEPTED');

    const acceptedAt = new Date();
    const result = await this.prismaWrite.$transaction(async (tx: any) => {
      // Conditional claim so a double-click cannot write three QUOTE_ACCEPTED events.
      const claimed = await tx.quote.updateMany({
        where: { id: quoteId, status: { in: ['SENT', 'VIEWED'] } },
        data: {
          status: 'ACCEPTED',
          acceptedAt,
          signatureName,
          signatureDate: new Date(dto.signatureDate),
          clientNotes: dto.notes,
        },
      });
      if (claimed.count !== 1) {
        throw new BusinessLogicException('Quote already accepted or declined', 'QUOTE_003');
      }

      await tx.projectRequest.update({
        where: { id: quote.requestId },
        data: { status: 'ACCEPTED' },
      });

      await tx.outbox.create({
        data: {
          type: 'QUOTE_ACCEPTED',
          aggregateType: 'QUOTE',
          aggregateId: quoteId,
          payload: { quoteId, requestId: quote.requestId, userId },
        },
      });

      return { acceptedAt };
    });

    const provisioned = await this.projectsProvisioner.provisionFromAcceptedQuote({
      quoteId,
      requestId: quote.requestId,
      userId,
    });

    const projectStatus = provisioned?.status
      ? provisioned.status.toLowerCase().replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
      : 'creating';

    return {
      quoteId,
      status: 'accepted',
      acceptedAt: result.acceptedAt,
      contractStatus: 'signed',
      projectId: provisioned?.projectId ?? null,
      project: provisioned
        ? { id: provisioned.projectId, status: projectStatus }
        : { id: 'pending', status: 'creating' },
      nextSteps: {
        action: 'paymentRequired',
        description:
          'Your service agreement is signed. Complete the deposit to start your project.',
      },
    };
  }

  async declineQuote(userId: string, quoteId: string, dto: DeclineQuoteDto) {
    const quote = await this.prismaWrite.quote.findFirst({
      where: { id: quoteId, userId },
    });

    if (!quote) throw new BusinessLogicException('Quote not found', 'QUOTE_001');

    if (['ACCEPTED', 'DECLINED'].includes(quote.status)) {
      throw new BusinessLogicException('Quote already processed', 'QUOTE_003');
    }

    const requestStatus = dto.requestRevision ? 'CHANGES_REQUESTED' : 'REJECTED';
    const outboxType = dto.requestRevision ? 'QUOTE_REVISION_REQUESTED' : 'QUOTE_DECLINED';

    assertValidTransition('QUOTE', quote.status, 'DECLINED');

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.quote.update({
        where: { id: quoteId },
        data: {
          status: 'DECLINED',
          declinedAt: new Date(),
          declineReason: dto.reason,
          clientNotes: dto.feedback,
        },
      });

      await tx.projectRequest.update({
        where: { id: quote.requestId },
        data: { status: requestStatus },
      });

      await tx.outbox.create({
        data: {
          type: outboxType,
          aggregateType: 'QUOTE',
          aggregateId: quoteId,
          payload: {
            quoteId,
            requestId: quote.requestId,
            reason: dto.reason,
            revisionRequested: dto.requestRevision,
          },
        },
      });
    });

    return {
      quoteId,
      status: 'declined',
      declinedAt: new Date(),
      reason: dto.reason,
      revisionRequested: dto.requestRevision,
    };
  }

  async requestChanges(userId: string, quoteId: string, dto: RequestQuoteChangesDto) {
    const quote = await this.prismaWrite.quote.findFirst({
      where: { id: quoteId, userId },
    });

    if (!quote) throw new BusinessLogicException('Quote not found', 'QUOTE_001');

    if (['ACCEPTED', 'DECLINED'].includes(quote.status)) {
      throw new BusinessLogicException('Cannot modify accepted/declined quote', 'QUOTE_006');
    }

    assertValidTransition('QUOTE', quote.status, 'CHANGES_REQUESTED');

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.quote.update({
        where: { id: quoteId },
        data: {
          status: 'CHANGES_REQUESTED',
          clientNotes: JSON.stringify(dto),
        },
      });

      await tx.projectRequest.update({
        where: { id: quote.requestId },
        data: { status: 'CHANGES_REQUESTED' },
      });

      await tx.outbox.create({
        data: {
          type: 'QUOTE_CHANGES_REQUESTED',
          aggregateType: 'QUOTE',
          aggregateId: quoteId,
          payload: { quoteId, changes: dto.changes },
        },
      });
    });

    const estimatedRevisionDate = new Date();
    estimatedRevisionDate.setDate(estimatedRevisionDate.getDate() + 1);

    return {
      quoteId,
      status: 'changesRequested',
      requestedAt: new Date(),
      estimatedRevisionDate,
    };
  }
}
