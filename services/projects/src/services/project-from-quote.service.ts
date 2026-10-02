import { Injectable, Logger } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';
import { BusinessLogicException } from '@nestlancer/common';

import { QuoteAcceptedEventDto } from '../dto/quote-accepted-event.dto';
import { ProjectPaymentScheduleService } from './project-payment-schedule.service';

/** Quote accept provisioning creates project + milestones + payments in one tx. */
const PROJECT_FROM_QUOTE_TX = { maxWait: 10_000, timeout: 30_000 } as const;

export interface QuoteAcceptedPayload {
  quoteId: string;
  requestId: string;
  userId: string;
}

function resolveTargetEndDate(quote: { validUntil: Date; timeline: unknown }): Date {
  if (quote.timeline && typeof quote.timeline === 'object' && quote.timeline !== null) {
    const timeline = quote.timeline as Record<string, unknown>;
    if (timeline.estimatedEndDate) {
      return new Date(String(timeline.estimatedEndDate));
    }
  }
  return quote.validUntil;
}

@Injectable()
export class ProjectFromQuoteService {
  private readonly logger = new Logger(ProjectFromQuoteService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly paymentSchedule: ProjectPaymentScheduleService,
  ) {}

  async createFromAcceptedQuote(payload: QuoteAcceptedPayload) {
    const { quoteId, requestId, userId } = payload;

    const existing = await this.prismaWrite.project.findUnique({
      where: { quoteId },
      select: { id: true, status: true, quoteId: true, clientId: true },
    });
    if (existing) {
      this.logger.log(`Project already exists for quote ${quoteId}: ${existing.id}`);
      await this.paymentSchedule.backfillIfMissing(existing.id, userId);
      return {
        projectId: existing.id,
        quoteId: existing.quoteId,
        requestId,
        status: existing.status,
        created: false,
      };
    }

    const quote = await this.prismaWrite.quote.findFirst({
      where: { id: quoteId, userId, requestId },
      include: { request: true },
    });

    if (!quote) {
      throw new BusinessLogicException(
        `Quote ${quoteId} not found for user ${userId}`,
        'QUOTE_001',
      );
    }

    if (quote.status !== 'ACCEPTED') {
      throw new BusinessLogicException(
        `Quote ${quoteId} is not accepted (status: ${quote.status})`,
        'QUOTE_005',
      );
    }

    const targetEndDate = resolveTargetEndDate(quote);
    const initialStatus = 'PENDING_PAYMENT';

    const result = await this.prismaWrite.$transaction(async (tx: any) => {
      const project = await tx.project.create({
        data: {
          title: quote.title,
          description: quote.description,
          status: initialStatus as any,
          quoteId: quote.id,
          clientId: userId,
          adminId: quote.createdById ?? undefined,
          targetEndDate,
          startDate: new Date(),
        },
      });

      await tx.projectRequest.update({
        where: { id: requestId },
        data: { status: 'CONVERTED_TO_PROJECT' },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId,
          status: 'CONVERTED_TO_PROJECT',
          note: 'Converted to project from accepted quote',
        },
      });

      await this.paymentSchedule.ensureScheduleWithTemplate(tx, {
        projectId: project.id,
        clientId: userId,
        quote: {
          paymentSchedule: quote.paymentSchedule,
          paymentBreakdown: quote.paymentBreakdown,
          totalAmount: quote.totalAmount,
          currency: quote.currency,
          timeline: quote.timeline,
        },
        targetEndDate,
      });

      await tx.outbox.create({
        data: {
          type: 'PROJECT_CREATED',
          aggregateType: 'PROJECT',
          aggregateId: project.id,
          payload: {
            projectId: project.id,
            quoteId: quote.id,
            requestId: quote.requestId,
            userId,
            title: project.title,
            totalAmount: quote.totalAmount,
            currency: quote.currency,
            previousStatus: null,
            newStatus: project.status,
            status: project.status,
          },
        },
      });

      return project;
    }, PROJECT_FROM_QUOTE_TX);

    this.logger.log(`Created project ${result.id} from accepted quote ${quoteId}`);

    return {
      projectId: result.id,
      quoteId: result.quoteId,
      requestId,
      status: result.status,
      created: true,
    };
  }

  validatePayload(raw: unknown): QuoteAcceptedEventDto {
    const dto = raw as QuoteAcceptedEventDto;
    if (!dto?.quoteId || !dto?.requestId || !dto?.userId) {
      throw new BusinessLogicException('Invalid QUOTE_ACCEPTED payload', 'EVENT_001');
    }
    return dto;
  }
}
