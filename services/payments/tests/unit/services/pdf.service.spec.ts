import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { PrismaWriteService } from '@nestlancer/database';
import { DocumentGenerationService } from '@nestlancer/documents';
import { ReceiptPdfService } from '../../../src/services/receipt-pdf.service';
import { InvoicePdfService } from '../../../src/services/invoice-pdf.service';
import { PaymentDocumentContextService } from '../../../src/services/payment-document-context.service';

describe('Payment PdfService', () => {
  let prismaWrite: any;
  let documentGen: jest.Mocked<DocumentGenerationService>;
  let paymentDocContext: {
    buildForPayment: jest.Mock;
    companyBlock: jest.Mock;
  };

  const completedPayment = {
    id: 'p1',
    paidAt: new Date(),
    amount: 10000,
    currency: 'INR',
    method: 'UPI',
    externalId: 'txn-1',
    receiptNumber: null,
    invoiceNumber: null,
    clientId: 'user-1',
    client: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
    project: { id: 'proj-1', title: 'Project 1' },
    milestone: { id: 'm1', name: 'M1', amount: 10000 },
    paymentRequestedAt: new Date(),
    customNotes: null,
  };

  beforeEach(() => {
    prismaWrite = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    documentGen = {
      getLatestDocument: jest.fn().mockResolvedValue(null),
      generateAndStore: jest.fn().mockResolvedValue({
        id: 'doc-1',
        documentNumber: 'NL-RCPT-2026-000001',
        downloadUrl: 'https://signed.example/receipt.pdf',
        storageKey: 'receipts/p1/v1/doc.pdf',
      }),
    } as any;
    paymentDocContext = {
      buildForPayment: jest.fn().mockResolvedValue({
        engagement: { currentMilestoneName: 'M1', paymentSequenceLabel: null },
      }),
      companyBlock: jest.fn().mockReturnValue({ name: 'Nestlancer' }),
    };
  });

  describe('ReceiptPdfService', () => {
    let service: ReceiptPdfService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReceiptPdfService,
          { provide: PrismaWriteService, useValue: prismaWrite },
          { provide: DocumentGenerationService, useValue: documentGen },
          { provide: PaymentDocumentContextService, useValue: paymentDocContext },
        ],
      }).compile();
      service = module.get<ReceiptPdfService>(ReceiptPdfService);
    });

    it('throws NotFoundException if payment not found', async () => {
      paymentDocContext.buildForPayment.mockRejectedValue(
        new NotFoundException('Payment not found'),
      );
      prismaWrite.payment.findUnique.mockResolvedValue(null);
      await expect(service.generateReceipt('p1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if payment not completed', async () => {
      prismaWrite.payment.findUnique.mockResolvedValue({ id: 'p1', paidAt: null } as any);
      await expect(service.generateReceipt('p1')).rejects.toThrow(NotFoundException);
    });

    it('reuses an existing receipt without regenerating', async () => {
      prismaWrite.payment.findUnique.mockResolvedValue(completedPayment as any);
      documentGen.getLatestDocument.mockResolvedValue({
        id: 'doc-r1',
        documentNumber: 'NL-RCPT-2026-000001',
        downloadUrl: 'https://signed.example/existing.pdf',
        storageKey: 'receipts/p1/v1/doc.pdf',
      } as any);

      const result = await service.generateReceipt('p1');

      expect(documentGen.generateAndStore).not.toHaveBeenCalled();
      expect(result).toEqual({
        url: 'https://signed.example/existing.pdf',
        filename: 'receipt-NL-RCPT-2026-000001.pdf',
        documentNumber: 'NL-RCPT-2026-000001',
      });
    });

    it('delegates to document generation when no receipt exists yet', async () => {
      prismaWrite.payment.findUnique.mockResolvedValue(completedPayment as any);
      documentGen.generateAndStore.mockResolvedValue({
        documentNumber: 'NL-RCPT-2026-000001',
        downloadUrl: 'https://signed.example/existing.pdf',
      } as any);

      const result = await service.generateReceipt('p1');

      expect(documentGen.getLatestDocument).toHaveBeenCalled();
      expect(documentGen.generateAndStore).toHaveBeenCalled();
      expect(result).toEqual({
        url: 'https://signed.example/existing.pdf',
        filename: 'receipt-NL-RCPT-2026-000001.pdf',
        documentNumber: 'NL-RCPT-2026-000001',
      });
    });

    it('generates and stores receipt via documents lib', async () => {
      prismaWrite.payment.findUnique.mockResolvedValue(completedPayment as any);

      const result = await service.generateReceipt('p1');

      expect(documentGen.generateAndStore).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: DocumentType.RECEIPT,
          entityType: 'PAYMENT',
          entityId: 'p1',
          template: 'receipt',
        }),
      );
      expect(prismaWrite.payment.update).toHaveBeenCalled();
      expect(result.documentNumber).toBe('NL-RCPT-2026-000001');
    });
  });

  describe('InvoicePdfService', () => {
    let service: InvoicePdfService;

    beforeEach(async () => {
      documentGen.generateAndStore.mockResolvedValue({
        id: 'doc-2',
        documentNumber: 'NL-INV-2026-000001',
        downloadUrl: 'https://signed.example/invoice.pdf',
        storageKey: 'invoices/p1/v1/doc.pdf',
      } as any);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          InvoicePdfService,
          { provide: PrismaWriteService, useValue: prismaWrite },
          { provide: DocumentGenerationService, useValue: documentGen },
          { provide: PaymentDocumentContextService, useValue: paymentDocContext },
        ],
      }).compile();
      service = module.get<InvoicePdfService>(InvoicePdfService);
    });

    it('generates and stores invoice via documents lib', async () => {
      prismaWrite.payment.findUnique.mockResolvedValue(completedPayment as any);

      const result = await service.generateInvoice('p1');

      expect(documentGen.getLatestDocument).toHaveBeenCalledWith(
        DocumentType.INVOICE,
        'PAYMENT',
        'p1',
      );
      expect(documentGen.generateAndStore).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: DocumentType.INVOICE,
          entityType: 'PAYMENT',
          entityId: 'p1',
          template: 'invoice',
        }),
      );
      expect(result.documentNumber).toBe('NL-INV-2026-000001');
    });

    it('reuses an existing invoice without regenerating on download', async () => {
      prismaWrite.payment.findUnique.mockResolvedValue({
        ...completedPayment,
        invoiceNumber: 'NL-INV-2026-000045',
        currentInvoiceDocumentId: 'doc-issued',
      } as any);
      documentGen.getLatestDocument.mockResolvedValue({
        id: 'doc-issued',
        documentNumber: 'NL-INV-2026-000045',
        downloadUrl: 'https://signed.example/issued.pdf',
        storageKey: 'invoices/p1/v1/issued.pdf',
      } as any);

      const result = await service.generateInvoice('p1');

      expect(documentGen.generateAndStore).not.toHaveBeenCalled();
      expect(result.documentNumber).toBe('NL-INV-2026-000045');
    });
  });
});
