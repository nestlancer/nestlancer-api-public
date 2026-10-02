import { Injectable, NotFoundException } from '@nestjs/common';
import { sanitizeClientPaymentNotes, splitInclusiveTaxPaise } from '@nestlancer/common';
import { DocumentType } from '@prisma/client';
import { PrismaWriteService } from '@nestlancer/database';
import { DocumentGenerationService } from '@nestlancer/documents';

import { PaymentDocumentContextService } from './payment-document-context.service';

interface PdfResult {
  url: string;
  filename: string;
  documentNumber?: string;
}

@Injectable()
export class InvoicePdfService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly documentGen: DocumentGenerationService,
    private readonly paymentDocContext: PaymentDocumentContextService,
  ) {}

  async generateInvoice(paymentId: string): Promise<PdfResult> {
    const paymentContext = await this.paymentDocContext.buildForPayment(paymentId);

    const payment = await this.prismaWrite.payment.findUnique({
      where: { id: paymentId },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: {
          select: { id: true, title: true, quote: { select: { taxPercentage: true } } },
        },
        milestone: { select: { id: true, name: true, amount: true } },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');

    // NL-BUG-DOC-001: prefer the already-issued invoice over minting a download number.
    // generateAndStore also serializes concurrent writers; this skips PDF work when present.
    const existing = await this.documentGen.getLatestDocument(
      DocumentType.INVOICE,
      'PAYMENT',
      paymentId,
    );
    if (existing) {
      if (
        payment.currentInvoiceDocumentId !== existing.id ||
        payment.invoiceNumber !== existing.documentNumber
      ) {
        await this.prismaWrite.payment.update({
          where: { id: paymentId },
          data: {
            invoiceNumber: existing.documentNumber,
            invoiceUrl: existing.storageKey,
            currentInvoiceDocumentId: existing.id,
          },
        });
      }
      return {
        url: existing.downloadUrl,
        filename: `invoice-${existing.documentNumber}.pdf`,
        documentNumber: existing.documentNumber,
      };
    }

    const split = splitInclusiveTaxPaise(
      payment.amount,
      Number(payment.project.quote?.taxPercentage ?? 0),
    );
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
        // Canonical NL-INV-* is injected by DocumentGenerationService; do not pass legacy INV-NL-*.
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
        milestoneId: payment.milestoneId ?? undefined,
        projectTitle: payment.project.title,
        paymentContext,
        company: await this.paymentDocContext.companyBlock(),
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
      triggeredByEvent: 'INVOICE_DOWNLOAD',
      changeReason: 'Invoice generated on download',
      repairImmutableTemplate: true,
    });

    await this.prismaWrite.payment.update({
      where: { id: paymentId },
      data: {
        // Always align payment.invoiceNumber with the registry number printed on the PDF.
        invoiceNumber: result.documentNumber,
        invoiceUrl: result.storageKey,
        currentInvoiceDocumentId: result.id,
      },
    });

    return {
      url: result.downloadUrl,
      filename: `invoice-${result.documentNumber}.pdf`,
      documentNumber: result.documentNumber,
    };
  }
}
