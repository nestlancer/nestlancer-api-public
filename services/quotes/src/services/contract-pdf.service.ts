import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType } from '@prisma/client';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { BusinessLogicException, buildContractTemplateData, QuoteStatus, normalizeGstinOrNull, normalizePanOrNull } from '@nestlancer/common';
import { DocumentGenerationService, DocumentStorageService } from '@nestlancer/documents';
import { PdfService, isPdfTemplateStale } from '@nestlancer/pdf';

type QuoteWithRelations = {
  id: string;
  userId: string;
  quoteNumber: string | null;
  contractNumber: string | null;
  title: string;
  description: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  terms: string | null;
  termsAndConditions: string | null;
  paymentBreakdown: unknown;
  paymentSchedule: unknown;
  revisionsIncluded: number;
  acceptedAt: Date | null;
  signatureName: string | null;
  validUntil: Date;
  status: string;
  request: { title: string } | null;
  user: { firstName: string; lastName: string; email: string };
};

@Injectable()
export class ContractPdfService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly documentGen: DocumentGenerationService,
    private readonly documentStorage: DocumentStorageService,
    private readonly pdfService: PdfService,
    private readonly config: ConfigService,
  ) {}

  async getContractDownloadUrl(userId: string, quoteId: string) {
    await this.assertClientQuoteAccess(userId, quoteId, true);
    const doc = await this.resolveSignedContractDocument(quoteId);
    return this.toDownloadPayload(quoteId, doc);
  }

  async getContractDownloadUrlAdmin(quoteId: string) {
    const quote = await this.loadQuote(quoteId);
    if (!quote.acceptedAt) {
      throw new BusinessLogicException('Contract not yet generated', 'DOC_001');
    }
    const doc = await this.resolveSignedContractDocument(quoteId);
    return this.toDownloadPayload(quoteId, doc);
  }

  async getContractPreviewUrl(userId: string, quoteId: string) {
    const quote = await this.assertClientQuoteAccess(userId, quoteId, false);
    if (quote.acceptedAt) {
      throw new BusinessLogicException(
        'Use the signed contract download after acceptance',
        'DOC_002',
      );
    }

    const pdfResult = await this.pdfService.generate({
      template: 'contract',
      data: buildContractTemplateData(quote, await this.companyBlock(), { draft: true }),
    });

    const bucket = this.documentStorage.getBucket(DocumentType.CONTRACT);
    const key = `contracts/${quoteId}/previews/${Date.now()}-draft.pdf`;
    await this.documentStorage.upload(bucket, key, pdfResult.buffer, pdfResult.mimeType, {
      draft: 'true',
      quoteId,
    });
    const downloadUrl = await this.documentStorage.getDownloadUrl(bucket, key, 3600);

    return {
      quoteId,
      documentNumber: quote.quoteNumber || `DRAFT-${quoteId.slice(0, 8)}`,
      downloadUrl,
      expiresIn: 3600,
      isDraft: true,
    };
  }

  async generateAndStore(
    quoteId: string,
    changeReason = 'On-demand generation',
    repairImmutableTemplate = false,
  ) {
    const quote = await this.loadQuote(quoteId);
    if (!quote.acceptedAt) {
      throw new BusinessLogicException('Contract not yet generated', 'DOC_001');
    }

    const result = await this.documentGen.generateAndStore({
      documentType: DocumentType.CONTRACT,
      entityType: 'QUOTE',
      entityId: quoteId,
      template: 'contract',
      templateData: buildContractTemplateData(quote, await this.companyBlock(), {
        signatureName: quote.signatureName ?? undefined,
        acceptedAt: quote.acceptedAt.toISOString().split('T')[0],
      }),
      issuedToUserId: quote.userId,
      triggeredByEvent: 'QUOTE_ACCEPTED',
      changeReason,
      isImmutable: true,
      repairImmutableTemplate,
    });

    await this.prismaWrite.quote.update({
      where: { id: quoteId },
      data: {
        contractNumber: quote.contractNumber || result.documentNumber,
        contractDocumentId: result.id,
      },
    });

    return result;
  }

  private async resolveSignedContractDocument(quoteId: string) {
    let doc = await this.documentGen.getLatestDocument(DocumentType.CONTRACT, 'QUOTE', quoteId);
    if (!doc) {
      doc = await this.generateAndStore(quoteId);
    } else {
      const stored = await this.prismaRead.generatedDocument.findUnique({
        where: { id: doc.id },
        select: { metadata: true },
      });
      if (stored && isPdfTemplateStale(stored.metadata)) {
        doc = await this.generateAndStore(quoteId, 'PDF template refresh', true);
      }
    }
    return doc;
  }

  private toDownloadPayload(quoteId: string, doc: { documentNumber: string; downloadUrl: string }) {
    return {
      quoteId,
      documentNumber: doc.documentNumber,
      downloadUrl: doc.downloadUrl,
      expiresIn: 3600,
      isDraft: false,
    };
  }

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

  private async loadQuote(quoteId: string): Promise<QuoteWithRelations> {
    const quote = await this.prismaRead.quote.findUnique({
      where: { id: quoteId },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        request: { select: { title: true } },
      },
    });
    if (!quote) throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    return quote as QuoteWithRelations;
  }

  private async assertClientQuoteAccess(
    userId: string,
    quoteId: string,
    requireAccepted: boolean,
  ): Promise<QuoteWithRelations> {
    const quote = await this.prismaRead.quote.findFirst({
      where: {
        id: quoteId,
        userId,
        status: { notIn: [QuoteStatus.DRAFT, QuoteStatus.PENDING] },
      },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        request: { select: { title: true } },
      },
    });
    if (!quote) throw new BusinessLogicException('Quote not found', 'QUOTE_001');
    if (requireAccepted && !quote.acceptedAt) {
      throw new BusinessLogicException('Contract not yet generated', 'DOC_001');
    }
    return quote as QuoteWithRelations;
  }
}
