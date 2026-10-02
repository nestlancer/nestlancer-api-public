import { BusinessLogicException } from '@nestlancer/common';
import { DocumentType } from '@prisma/client';
import { QuotePdfService } from '../../../src/services/quote-pdf.service';

describe('QuotePdfService', () => {
  let service: QuotePdfService;
  let prismaRead: any;
  let prismaWrite: any;
  let documentGen: any;
  let config: any;

  const mockQuote = {
    id: 'quote-1',
    userId: 'user-1',
    quoteNumber: 'NL-QTE-2026-000001',
    totalAmount: 5000,
    currency: 'INR',
    subtotal: 5000,
    taxAmount: 0,
    paymentBreakdown: [{ description: 'Design', amount: 5000 }],
    createdAt: new Date('2026-06-01'),
    validUntil: new Date('2026-07-01'),
    title: 'Build Website',
    terms: 'Net 30',
    request: { title: 'Build Website' },
    user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'test@example.com' },
  };

  beforeEach(() => {
    prismaRead = {
      quote: {
        findFirst: jest.fn().mockResolvedValue({ id: 'quote-1', currentQuoteDocumentId: null }),
        findUnique: jest.fn().mockResolvedValue(mockQuote),
      },
      project: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };
    prismaWrite = {
      quote: { update: jest.fn().mockResolvedValue({}) },
    };
    documentGen = {
      getLatestDocument: jest.fn().mockResolvedValue(null),
      generateAndStore: jest.fn().mockResolvedValue({
        id: 'doc-1',
        documentNumber: 'NL-QTE-2026-000001',
        versionNumber: 1,
        downloadUrl: 'https://signed.example/quote.pdf',
      }),
    };
    config = {
      get: jest.fn().mockImplementation((key: string, fallback?: string) => fallback),
    };

    service = new QuotePdfService(prismaRead, prismaWrite, documentGen, config);
  });

  describe('getPdfDownloadUrl', () => {
    it('always resolves PDF via generateAndStore (cache + stale refresh)', async () => {
      prismaRead.quote.findFirst.mockResolvedValue({
        id: 'quote-1',
        currentQuoteDocumentId: null,
        status: 'SENT',
      });
      documentGen.generateAndStore.mockResolvedValue({
        id: 'doc-1',
        documentNumber: 'NL-QTE-2026-000001',
        versionNumber: 2,
        downloadUrl: 'https://signed.example/quote-v2.pdf',
      });

      const result = await service.getPdfDownloadUrl('user-1', 'quote-1');

      expect(result).toEqual({
        quoteId: 'quote-1',
        documentNumber: 'NL-QTE-2026-000001',
        version: 2,
        downloadUrl: 'https://signed.example/quote-v2.pdf',
        expiresIn: Number(process.env.S3_PRESIGNED_URL_EXPIRY || 900),
      });
      expect(documentGen.generateAndStore).toHaveBeenCalled();
      expect(prismaRead.quote.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { notIn: ['DRAFT', 'PENDING'] },
          }),
        }),
      );
    });

    it('rejects draft quotes for clients (NL-BUG-QUOTE-001)', async () => {
      prismaRead.quote.findFirst.mockResolvedValue(null);
      try {
        await service.getPdfDownloadUrl('user-1', 'quote-1');
        throw new Error('expected rejection');
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessLogicException);
        expect((e as BusinessLogicException).getStatus()).toBe(404);
      }
      expect(documentGen.generateAndStore).not.toHaveBeenCalled();
    });

    it('generates and stores document when none exists', async () => {
      const result = await service.getPdfDownloadUrl('user-1', 'quote-1');

      expect(documentGen.generateAndStore).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: DocumentType.QUOTE,
          entityType: 'QUOTE',
          entityId: 'quote-1',
          template: 'quote',
          forceNewVersion: false,
        }),
      );
      expect(prismaWrite.quote.update).toHaveBeenCalled();
      expect(result.downloadUrl).toBe('https://signed.example/quote.pdf');
    });

    it('throws NOT_FOUND for non-existent quote', async () => {
      prismaRead.quote.findFirst.mockResolvedValue(null);
      try {
        await service.getPdfDownloadUrl('user-1', 'invalid');
        throw new Error('expected rejection');
      } catch (e) {
        expect(e).toBeInstanceOf(BusinessLogicException);
        expect((e as BusinessLogicException).getStatus()).toBe(404);
      }
    });

    it('generates PDF when validUntil is absent', async () => {
      prismaRead.quote.findUnique.mockResolvedValue({ ...mockQuote, validUntil: null });
      await service.getPdfDownloadUrl('user-1', 'quote-1');
      expect(documentGen.generateAndStore).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            expiryDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          }),
        }),
      );
    });
  });
});
