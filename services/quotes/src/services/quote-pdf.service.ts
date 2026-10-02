import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType } from '@prisma/client';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { BusinessLogicException, QuoteStatus, normalizeGstinOrNull, normalizePanOrNull } from '@nestlancer/common';
import { DocumentGenerationService } from '@nestlancer/documents';

/** Client-facing quote routes must hide unissued drafts (NL-BUG-QUOTE-001). */
const CLIENT_HIDDEN_QUOTE_STATUSES = [QuoteStatus.DRAFT, QuoteStatus.PENDING] as const;

@Injectable()
export class QuotePdfService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly documentGen: DocumentGenerationService,
    private readonly config: ConfigService,
  ) {}

  async getPdfDownloadUrl(userId: string, quoteId: string) {
    const quote = await this.prismaRead.quote.findFirst({
      where: {
        id: quoteId,
        userId,
        status: { notIn: [...CLIENT_HIDDEN_QUOTE_STATUSES] },
      },
      select: { id: true, currentQuoteDocumentId: true },
    });
    if (!quote) throw new BusinessLogicException('Quote not found', 'QUOTE_001');

    const doc = await this.generateAndStore(quoteId, 'On-demand download');

    return {
      quoteId,
      documentNumber: doc.documentNumber,
      version: doc.versionNumber,
      downloadUrl: doc.downloadUrl,
      expiresIn: Number(process.env.S3_PRESIGNED_URL_EXPIRY || 900),
    };
  }

  async generateAndStore(
    quoteId: string,
    changeReason = 'On-demand generation',
    forceNewVersion = false,
  ) {
    const quote = (await this.prismaRead.quote.findUnique({
      where: { id: quoteId },
      include: {
        request: { select: { title: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })) as any;

    if (!quote) throw new BusinessLogicException('Quote not found', 'QUOTE_001');

    const project = await this.prismaRead.project.findUnique({
      where: { quoteId },
      select: { id: true },
    });

    const breakdown = (quote.paymentBreakdown as Array<Record<string, unknown>>) || [];
    const items = breakdown.map((item) => {
      const unitPricePaise = Number(item.unitPrice ?? item.amount ?? 0);
      const totalPaise = Number(
        item.totalPrice ?? item.amount ?? Number(item.quantity ?? 1) * unitPricePaise,
      );
      return {
        description: String(item.description || item.name || 'Line item'),
        quantity: Number(item.quantity ?? 1),
        unitPricePaise,
        totalPaise,
      };
    });

    const expiryDate = quote.validUntil
      ? quote.validUntil.toISOString().split('T')[0]
      : new Date(quote.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const result = await this.documentGen.generateAndStore({
      documentType: DocumentType.QUOTE,
      entityType: 'QUOTE',
      entityId: quoteId,
      template: 'quote',
      templateData: {
        quoteNumber: quote.quoteNumber,
        quoteDate: quote.createdAt.toISOString().split('T')[0],
        expiryDate,
        totalPaise: quote.totalAmount,
        subtotalPaise: quote.subtotal,
        taxPaise: quote.taxAmount,
        currency: quote.currency,
        description: quote.description,
        company: await this.companyBlock(),
        client: {
          name: `${quote.user.firstName} ${quote.user.lastName}`,
          email: quote.user.email,
        },
        projectTitle: quote.request?.title || quote.title,
        projectId: project?.id,
        items,
        terms: quote.terms,
        termsAndConditions: quote.termsAndConditions,
        paymentSchedule: quote.paymentSchedule,
      },
      issuedToUserId: quote.userId,
      triggeredByEvent: 'QUOTE_PDF_REQUESTED',
      changeReason,
      forceNewVersion,
      repairImmutableTemplate: true,
    });

    await this.prismaWrite.quote.update({
      where: { id: quoteId },
      data: {
        quoteNumber: quote.quoteNumber || result.documentNumber,
        currentQuoteDocumentId: result.id,
      },
    });

    return result;
  }

  /** NL-BUG-PDF-001: legal identity from DB; blank fields when unset. */
  private async companyBlock(): Promise<Record<string, string>> {
    const envName = this.config.get('COMPANY_NAME', 'Nestlancer') || 'Nestlancer';
    const blank = {
      name: envName,
      legalName: '',
      address: '',
      state: '',
      stateCode: '',
      gst: '',
      pan: '',
      cin: '',
      email: '',
      phone: '',
      website: '',
    };
    try {
      const primary = await this.prismaRead.companyLegalProfile.findFirst({
        where: { isActive: true, isPrimary: true },
      });
      const profile =
        primary ??
        (await this.prismaRead.companyLegalProfile.findFirst({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }));
      if (!profile) return blank;
      return {
        name: profile.tradeName || profile.legalName || envName,
        legalName: profile.legalName || '',
        address: profile.address || '',
        state: profile.state || '',
        stateCode: profile.stateCode || '',
        gst: normalizeGstinOrNull(profile.gstin) || '',
        pan: normalizePanOrNull(profile.pan) || '',
        cin: profile.cin || '',
        email: profile.email || '',
        phone: profile.phone || '',
        website: profile.website || '',
      };
    } catch {
      return blank;
    }
  }
}
