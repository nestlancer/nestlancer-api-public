import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType } from '@prisma/client';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { buildContractTemplateData, sanitizeClientPaymentNotes, splitInclusiveTaxPaise, normalizeGstinOrNull, normalizePanOrNull } from '@nestlancer/common';
import { buildPaymentDocumentContext, DocumentGenerationService } from '@nestlancer/documents';

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly documentGen: DocumentGenerationService,
    private readonly configService: ConfigService,
  ) {}

  private async emitDocumentReady(params: {
    documentId: string;
    downloadUrl: string;
    userId: string;
    documentType: string;
    entityId: string;
    triggerEvent: string;
    title?: string;
    documentNumber?: string;
    projectId?: string;
    projectTitle?: string;
    paymentId?: string;
    quoteId?: string;
    amount?: number;
    currency?: string;
  }): Promise<void> {
    await this.prismaWrite.outbox.create({
      data: {
        type: 'DOCUMENT_READY',
        aggregateType: 'DOCUMENT',
        aggregateId: params.documentId,
        payload: {
          documentId: params.documentId,
          downloadUrl: params.downloadUrl,
          userId: params.userId,
          documentType: params.documentType,
          entityId: params.entityId,
          triggerEvent: params.triggerEvent,
          title: params.title,
          documentNumber: params.documentNumber,
          projectId: params.projectId,
          projectTitle: params.projectTitle,
          paymentId: params.paymentId,
          quoteId: params.quoteId,
          amount: params.amount,
          currency: params.currency,
        },
      },
    });
  }

  async process(routingKey: string, payload: Record<string, unknown>): Promise<void> {
    const eventType = (payload.type as string) || routingKey;

    switch (eventType) {
      case 'QUOTE_SENT':
      case 'quote.quote.sent':
        await this.generateQuotePdf(payload, 'Quote sent to client');
        break;
      case 'QUOTE_REVISION_CREATED':
      case 'document.quote.revised':
        await this.generateQuotePdf(payload, 'Quote revised by admin', true);
        break;
      case 'QUOTE_ACCEPTED':
      case 'quote.quote.accepted':
        await this.generateContractPdf(payload);
        break;
      case 'PAYMENT_COMPLETED':
      case 'payment.payment.completed':
        await this.generateInvoicePdf(payload);
        await this.generateReceiptPdf(payload);
        break;
      case 'PAYMENT_REQUESTED':
      case 'payment.payment.initiated':
      case 'MANUAL_PAYMENT_CREATED':
        await this.generateInvoicePdf(payload);
        break;
      case 'PAYMENT_REMINDER':
      case 'payment.payment.reminder':
        await this.generateReminderPdf(payload);
        break;
      default:
        this.logger.debug(`Ignoring unhandled document event: ${eventType}`);
    }
  }

  private async companyBlock() {
    // NL-BUG-PDF-001: legal fields from CompanyLegalProfile (blank when unset).
    const envName = this.configService.get('COMPANY_NAME', 'Nestlancer') || 'Nestlancer';
    let branding: Record<string, string> = {
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
      bankName: '',
      accountNumber: '',
      ifsc: '',
      upi: '',
    };

    try {
      const primaryLegal = await this.prismaRead.companyLegalProfile.findFirst({
        where: { isActive: true, isPrimary: true },
      });
      const legal =
        primaryLegal ??
        (await this.prismaRead.companyLegalProfile.findFirst({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }));
      if (legal) {
        branding = {
          ...branding,
          name: legal.tradeName || legal.legalName || envName,
          legalName: legal.legalName || '',
          address: legal.address || '',
          state: legal.state || '',
          stateCode: legal.stateCode || '',
          gst: normalizeGstinOrNull(legal.gstin) || '',
          pan: normalizePanOrNull(legal.pan) || '',
          cin: legal.cin || '',
          email: legal.email || '',
          phone: legal.phone || '',
          website: legal.website || '',
        };
      }
    } catch (e) {
      this.logger.warn(
        `Failed to load CompanyLegalProfile for documents: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    try {
      const primary = await this.prismaRead.platformPaymentAccount.findFirst({
        where: { isActive: true, isPrimary: true },
      });
      const account =
        primary ??
        (await this.prismaRead.platformPaymentAccount.findFirst({
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }));
      if (account) {
        return {
          ...branding,
          bankName: account.bankName || '',
          accountNumber: account.accountNumber || '',
          ifsc: account.ifsc || '',
          upi: account.upiVpa || '',
        };
      }
    } catch (e) {
      this.logger.warn(
        `Failed to load PlatformPaymentAccount for documents: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    return branding;
  }

  private async generateQuotePdf(
    payload: Record<string, unknown>,
    changeReason: string,
    forceNewVersion = false,
  ) {
    const quoteId = (payload.quoteId as string) || (payload.aggregateId as string);
    if (!quoteId) return;

    const quote = await this.prismaRead.quote.findUnique({
      where: { id: quoteId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        request: { select: { title: true } },
      },
    });
    if (!quote) return;

    const project = await this.prismaRead.project.findUnique({
      where: { quoteId },
      select: { id: true },
    });

    const breakdown = (quote.paymentBreakdown as Array<Record<string, unknown>>) || [];
    const items = breakdown.map((item) => {
      const quantity = Number(item.quantity ?? 1) || 1;
      const unitPricePaise = Number(item.unitPrice ?? item.amount ?? 0);
      const totalPaise = Number(
        item.totalPrice ?? item.amount ?? quantity * unitPricePaise,
      );
      return {
        description: String(item.description || item.name || 'Line item'),
        quantity,
        unitPricePaise,
        totalPaise,
      };
    });

    const result = await this.documentGen.generateAndStore({
      documentType: DocumentType.QUOTE,
      entityType: 'QUOTE',
      entityId: quoteId,
      template: 'quote',
      templateData: {
        quoteNumber: quote.quoteNumber,
        quoteDate: quote.createdAt.toISOString().split('T')[0],
        expiryDate: quote.validUntil.toISOString().split('T')[0],
        totalPaise: quote.totalAmount,
        subtotalPaise: quote.subtotal,
        taxPaise: quote.taxAmount,
        currency: quote.currency,
        versionNumber: forceNewVersion ? undefined : 1,
        company: await this.companyBlock(),
        client: {
          name: `${quote.user.firstName} ${quote.user.lastName}`,
          email: quote.user.email,
        },
        projectTitle: quote.request?.title || quote.title,
        projectId: project?.id,
        items,
        terms: quote.terms,
        scope: quote.scope,
      },
      issuedToUserId: quote.userId,
      triggeredByEvent: forceNewVersion ? 'QUOTE_REVISION_CREATED' : 'QUOTE_SENT',
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

    await this.emitDocumentReady({
      documentId: result.id,
      downloadUrl: result.downloadUrl,
      userId: quote.userId,
      documentType: 'QUOTE',
      entityId: quoteId,
      quoteId,
      projectTitle: quote.request?.title ?? quote.title ?? undefined,
      amount: quote.totalAmount,
      currency: quote.currency,
      triggerEvent: forceNewVersion ? 'QUOTE_REVISION_CREATED' : 'QUOTE_SENT',
      title: forceNewVersion ? 'Revised quote PDF' : 'Quote PDF',
    });
  }

  private async generateContractPdf(payload: Record<string, unknown>) {
    const quoteId = (payload.quoteId as string) || (payload.aggregateId as string);
    if (!quoteId) return;

    const quote = await this.prismaRead.quote.findUnique({
      where: { id: quoteId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        request: { select: { title: true } },
      },
    });
    if (!quote || !quote.acceptedAt) return;

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
      changeReason: 'Quote accepted by client',
      isImmutable: true,
      repairImmutableTemplate: true,
    });

    await this.prismaWrite.quote.update({
      where: { id: quoteId },
      data: {
        contractNumber: quote.contractNumber || result.documentNumber,
        contractDocumentId: result.id,
      },
    });

    await this.emitDocumentReady({
      documentId: result.id,
      downloadUrl: result.downloadUrl,
      userId: quote.userId,
      documentType: 'CONTRACT',
      entityId: quoteId,
      quoteId,
      projectTitle: quote.request?.title ?? quote.title ?? undefined,
      amount: quote.totalAmount,
      currency: quote.currency,
      triggerEvent: 'QUOTE_ACCEPTED',
      title: 'Contract PDF',
    });
  }

  private async generateReceiptPdf(payload: Record<string, unknown>) {
    const paymentId = payload.paymentId as string;
    if (!paymentId) return;

    const paymentContext = await buildPaymentDocumentContext(this.prismaRead, paymentId);
    if (!paymentContext) return;

    const payment = await this.prismaRead.payment.findUnique({
      where: { id: paymentId },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, title: true } },
        milestone: { select: { name: true } },
      },
    });
    if (!payment?.paidAt) return;

    const result = await this.documentGen.generateAndStore({
      documentType: DocumentType.RECEIPT,
      entityType: 'PAYMENT',
      entityId: paymentId,
      template: 'receipt',
      templateData: {
        // Canonical NL-RCPT-* / NL-INV-* injected by DocumentGenerationService.
        receiptDate: payment.paidAt.toISOString().split('T')[0],
        receiptTime: payment.paidAt.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        amountPaise: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.method || 'Online',
        transactionId: payment.externalId,
        paymentId: payment.id,
        paymentContext,
        company: await this.companyBlock(),
        client: {
          name: `${payment.client.firstName} ${payment.client.lastName}`,
          email: payment.client.email,
        },
        projectTitle: payment.project.title,
        milestoneName: payment.milestone?.name ?? paymentContext.engagement.currentMilestoneName,
      },
      issuedToUserId: payment.clientId,
      triggeredByEvent: 'PAYMENT_COMPLETED',
      changeReason: 'Payment completed',
      repairImmutableTemplate: true,
    });

    await this.prismaWrite.payment.update({
      where: { id: paymentId },
      data: {
        receiptNumber: result.documentNumber,
        receiptUrl: result.storageKey,
        currentReceiptDocumentId: result.id,
      },
    });

    await this.emitDocumentReady({
      documentId: result.id,
      downloadUrl: result.downloadUrl,
      userId: payment.clientId,
      documentType: 'RECEIPT',
      entityId: paymentId,
      paymentId,
      projectId: payment.projectId,
      projectTitle: payment.project?.title,
      amount: payment.amount,
      currency: payment.currency,
      triggerEvent: 'PAYMENT_COMPLETED',
      title: 'Payment receipt',
      documentNumber: result.documentNumber,
    });
  }

  private async generateInvoicePdf(payload: Record<string, unknown>) {
    const paymentId = payload.paymentId as string;
    if (!paymentId) return;

    const paymentContext = await buildPaymentDocumentContext(this.prismaRead, paymentId);
    if (!paymentContext) return;

    const payment = await this.prismaRead.payment.findUnique({
      where: { id: paymentId },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: {
          select: { id: true, title: true, quote: { select: { taxPercentage: true } } },
        },
        milestone: { select: { name: true, amount: true } },
      },
    });
    if (!payment) return;

    const taxPercentage = Number(payment.project.quote?.taxPercentage ?? 0);
    const split = splitInclusiveTaxPaise(payment.amount, taxPercentage);
    const subtotalPaise = split.subtotalPaise;
    const gstAmount = split.taxPaise;
    const gstRate = split.taxPercentage;
    const milestoneLabel =
      payment.milestone?.name ?? paymentContext.engagement.currentMilestoneName;

    const result = await this.documentGen.generateAndStore({
      documentType: DocumentType.INVOICE,
      entityType: 'PAYMENT',
      entityId: paymentId,
      template: 'invoice',
      templateData: {
        // Canonical NL-INV-* injected by DocumentGenerationService.
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: payment.paymentRequestedAt?.toISOString().split('T')[0] || '',
        totalPaise: payment.amount,
        subtotalPaise,
        taxPaise: gstAmount,
        cgstPaise: Math.floor(gstAmount / 2),
        sgstPaise: gstAmount - Math.floor(gstAmount / 2),
        currency: payment.currency,
        status: payment.status,
        paymentId: payment.id,
        projectTitle: payment.project.title,
        paymentContext,
        company: await this.companyBlock(),
        client: {
          name: `${payment.client.firstName} ${payment.client.lastName}`,
          email: payment.client.email,
        },
        project: { title: payment.project.title },
        items: [
          {
            description: milestoneLabel
              ? `${payment.project.title} — ${milestoneLabel}${
                  paymentContext.engagement.paymentSequenceLabel
                    ? ` (${paymentContext.engagement.paymentSequenceLabel})`
                    : ''
                }`
              : payment.project.title,
            quantity: 1,
            unitPricePaise: subtotalPaise,
            totalPaise: subtotalPaise,
            taxRate: gstRate,
            cgstPaise: Math.floor(gstAmount / 2),
            sgstPaise: gstAmount - Math.floor(gstAmount / 2),
          },
        ],
        notes: sanitizeClientPaymentNotes(payment.customNotes),
      },
      issuedToUserId: payment.clientId,
      triggeredByEvent: 'PAYMENT_REQUESTED',
      changeReason: 'Invoice issued',
      repairImmutableTemplate: true,
    });

    await this.prismaWrite.payment.update({
      where: { id: paymentId },
      data: {
        invoiceNumber: result.documentNumber,
        invoiceUrl: result.storageKey,
        currentInvoiceDocumentId: result.id,
      },
    });

    await this.emitDocumentReady({
      documentId: result.id,
      downloadUrl: result.downloadUrl,
      userId: payment.clientId,
      documentType: 'INVOICE',
      entityId: paymentId,
      paymentId,
      projectId: payment.projectId,
      projectTitle: payment.project?.title,
      amount: payment.amount,
      currency: payment.currency,
      triggerEvent: 'PAYMENT_REQUESTED',
      title: 'Invoice',
      documentNumber: result.documentNumber,
    });
  }

  private async generateReminderPdf(payload: Record<string, unknown>) {
    const paymentId = payload.paymentId as string;
    if (!paymentId) return;

    const payment = await this.prismaRead.payment.findUnique({
      where: { id: paymentId },
      include: {
        client: { select: { firstName: true, lastName: true, email: true } },
        project: { select: { title: true } },
      },
    });
    if (!payment) return;

    const result = await this.documentGen.generateAndStore({
      documentType: DocumentType.REMINDER,
      entityType: 'PAYMENT',
      entityId: paymentId,
      template: 'reminder',
      templateData: {
        dueDate: payment.paymentRequestedAt?.toISOString().split('T')[0] || '',
        amountPaise: payment.amount,
        currency: payment.currency,
        invoiceNumber: payment.invoiceNumber,
        projectTitle: payment.project.title,
        company: await this.companyBlock(),
        client: {
          name: `${payment.client.firstName} ${payment.client.lastName}`,
          email: payment.client.email,
        },
      },
      issuedToUserId: payment.clientId,
      triggeredByEvent: 'PAYMENT_REMINDER',
      changeReason: 'Payment reminder sent',
      forceNewVersion: true,
      repairImmutableTemplate: true,
    });

    await this.emitDocumentReady({
      documentId: result.id,
      downloadUrl: result.downloadUrl,
      userId: payment.clientId,
      documentType: 'REMINDER',
      entityId: paymentId,
      paymentId,
      projectId: payment.projectId,
      projectTitle: payment.project?.title,
      amount: payment.amount,
      currency: payment.currency,
      triggerEvent: 'PAYMENT_REMINDER',
      title: 'Payment reminder document',
    });
  }
}
