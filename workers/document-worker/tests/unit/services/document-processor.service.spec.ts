import { DocumentProcessorService } from '../../../src/services/document-processor.service';

describe('DocumentProcessorService', () => {
  let service: DocumentProcessorService;
  let prismaRead: any;
  let prismaWrite: any;
  let documentGen: any;
  let configService: any;

  beforeEach(() => {
    prismaRead = {
      quote: { findUnique: jest.fn().mockResolvedValue(null) },
      payment: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      project: { findUnique: jest.fn().mockResolvedValue({ id: 'project-1' }) },
      milestone: { findMany: jest.fn().mockResolvedValue([]) },
    };
    prismaWrite = {
      quote: { update: jest.fn().mockResolvedValue({}) },
      payment: { update: jest.fn().mockResolvedValue({}) },
      outbox: { create: jest.fn().mockResolvedValue({}) },
    };
    documentGen = {
      generateAndStore: jest.fn().mockResolvedValue({
        id: 'doc-1',
        documentNumber: 'NL-QTE-2026-000001',
        downloadUrl: 'https://signed.example/doc.pdf',
      }),
    };
    configService = {
      get: jest.fn().mockImplementation((key: string, fallback?: string) => fallback),
    };

    service = new DocumentProcessorService(prismaRead, prismaWrite, documentGen, configService);
  });

  it('ignores unknown event types', async () => {
    await expect(
      service.process('unknown.event', { type: 'UNKNOWN_EVENT' }),
    ).resolves.toBeUndefined();
    expect(documentGen.generateAndStore).not.toHaveBeenCalled();
  });

  it('generates quote PDF on QUOTE_SENT', async () => {
    prismaRead.quote.findUnique.mockResolvedValue({
      id: 'quote-1',
      userId: 'user-1',
      quoteNumber: null,
      totalAmount: 10000,
      subtotal: 10000,
      taxAmount: 0,
      currency: 'INR',
      createdAt: new Date(),
      validUntil: new Date(),
      title: 'Test',
      terms: null,
      paymentBreakdown: [],
      user: { id: 'user-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
      request: { title: 'Project' },
    });

    await service.process('quote.quote.sent', { quoteId: 'quote-1', type: 'QUOTE_SENT' });

    expect(documentGen.generateAndStore).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: 'quote-1',
        template: 'quote',
        changeReason: 'Quote sent to client',
      }),
    );
  });

  it('generates contract PDF on QUOTE_ACCEPTED', async () => {
    prismaRead.quote.findUnique.mockResolvedValue({
      id: 'quote-1',
      userId: 'user-1',
      quoteNumber: 'NL-QTE-2026-000001',
      totalAmount: 10000,
      subtotal: 10000,
      taxAmount: 0,
      currency: 'INR',
      acceptedAt: new Date(),
      acceptedTerms: true,
      signatureName: 'Jane Doe',
      signatureDate: new Date(),
      title: 'Test',
      user: { id: 'user-1', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
      request: { title: 'Project' },
    });

    await service.process('quote.quote.accepted', { quoteId: 'quote-1', type: 'QUOTE_ACCEPTED' });

    expect(documentGen.generateAndStore).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'contract',
        isImmutable: true,
        changeReason: 'Quote accepted by client',
      }),
    );
  });
});
