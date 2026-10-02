import { Injectable, NotFoundException } from '@nestjs/common';
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
export class ReceiptPdfService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly documentGen: DocumentGenerationService,
    private readonly paymentDocContext: PaymentDocumentContextService,
  ) {}

  async generateReceipt(paymentId: string): Promise<PdfResult> {
    const paymentContext = await this.paymentDocContext.buildForPayment(paymentId);

    const payment = await this.prismaWrite.payment.findUnique({
      where: { id: paymentId },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, title: true } },
        milestone: { select: { id: true, name: true } },
      },
    });

    if (!payment) throw new NotFoundException('Payment not found');
    if (!payment.paidAt) throw new NotFoundException('Payment has not been completed yet');

    // Same identity race as invoices: reuse an existing receipt before minting on download.
    const existing = await this.documentGen.getLatestDocument(
      DocumentType.RECEIPT,
      'PAYMENT',
      paymentId,
    );
    if (existing) {
      if (
        payment.currentReceiptDocumentId !== existing.id ||
        (payment.receiptNumber && payment.receiptNumber !== existing.documentNumber)
      ) {
        await this.prismaWrite.payment.update({
          where: { id: paymentId },
          data: {
            receiptNumber: payment.receiptNumber || existing.documentNumber,
            receiptUrl: existing.storageKey,
            currentReceiptDocumentId: existing.id,
          },
        });
      }
      return {
        url: existing.downloadUrl,
        filename: `receipt-${existing.documentNumber}.pdf`,
        documentNumber: existing.documentNumber,
      };
    }

    const result = await this.documentGen.generateAndStore({
      documentType: DocumentType.RECEIPT,
      entityType: 'PAYMENT',
      entityId: paymentId,
      template: 'receipt',
      templateData: {
        receiptNumber: payment.receiptNumber,
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
        invoiceNumber: payment.invoiceNumber,
        paymentId: payment.id,
        paymentContext,
        company: await this.paymentDocContext.companyBlock(),
        client: {
          name: `${payment.client.firstName} ${payment.client.lastName}`,
          email: payment.client.email,
        },
        projectTitle: payment.project.title,
        milestoneName: payment.milestone?.name ?? paymentContext.engagement.currentMilestoneName,
      },
      issuedToUserId: payment.clientId,
      triggeredByEvent: 'RECEIPT_DOWNLOAD',
      changeReason: 'Receipt generated on download',
      repairImmutableTemplate: true,
    });

    await this.prismaWrite.payment.update({
      where: { id: paymentId },
      data: {
        receiptNumber: payment.receiptNumber || result.documentNumber,
        receiptUrl: result.storageKey,
        currentReceiptDocumentId: result.id,
      },
    });

    return {
      url: result.downloadUrl,
      filename: `receipt-${result.documentNumber}.pdf`,
      documentNumber: result.documentNumber,
    };
  }
}
