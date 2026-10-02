import { QuotesService } from '../../../src/services/quotes.service';

describe('QuotesService', () => {
  let service: QuotesService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  const mockQuote = {
    id: 'quote-1',
    requestId: 'req-1',
    status: 'SENT',
    totalAmount: 5000,
    currency: 'INR',
    validUntil: new Date(Date.now() + 86400000 * 7),
    createdAt: new Date(),
    request: { title: 'Build Website', createdAt: new Date() },
    items: [{ description: 'Design', quantity: 1, unitPrice: 2000, totalPrice: 2000 }],
    user: { firstName: 'John', lastName: 'Doe', email: 'test@example.com' },
    scope: JSON.stringify({ included: ['Design'], excluded: ['Hosting'] }),
    timeline: JSON.stringify({ estimatedStartDate: new Date(), estimatedEndDate: new Date() }),
    paymentBreakdown: JSON.stringify([{ milestone: 'Advance', amount: 2500 }]),
    paymentSchedule: [
      { label: 'Deposit', amountPaise: 2500, percentage: 50, dueTrigger: 'on_accept', order: 1 },
      {
        label: 'Final payment',
        amountPaise: 2500,
        percentage: 50,
        dueTrigger: 'on_prior_approved',
        order: 2,
      },
    ],
    subtotal: 5000,
    taxRate: 0,
    taxAmount: 0,
    sentAt: new Date(),
    viewedAt: null,
    acceptedAt: null,
    declinedAt: null,
    attachments: [],
  };

  beforeEach(() => {
    mockPrismaRead = {
      quote: {
        findMany: jest.fn().mockResolvedValue([mockQuote]),
        findFirst: jest.fn().mockResolvedValue(mockQuote),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    mockPrismaWrite = {
      quote: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    service = new QuotesService(mockPrismaWrite, mockPrismaRead);
  });

  describe('getMyQuotes', () => {
    it('should return formatted paginated quote summaries', async () => {
      const result = await service.getMyQuotes('user-1');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('quote-1');
      expect(result.items[0].totalAmount).toBe(5000);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('treats status=all as no extra filter', async () => {
      await service.getMyQuotes('user-1', { status: 'all' });
      expect(mockPrismaRead.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { notIn: ['DRAFT', 'PENDING'] },
          }),
        }),
      );
    });

    it('rejects unknown status instead of querying Prisma', async () => {
      await expect(service.getMyQuotes('user-1', { status: 'nope' })).rejects.toThrow(
        'Invalid quote status',
      );
      expect(mockPrismaRead.quote.findMany).not.toHaveBeenCalled();
    });

    it('should return empty items when no quotes', async () => {
      mockPrismaRead.quote.findMany.mockResolvedValue([]);
      mockPrismaRead.quote.count.mockResolvedValue(0);
      const result = await service.getMyQuotes('user-1');
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getQuoteDetails', () => {
    it('should return detailed quote information', async () => {
      const result = await service.getQuoteDetails('user-1', 'quote-1');
      expect(result.id).toBe('quote-1');
      expect(result.totalAmount).toBe(5000);
    });

    it('should throw for non-existent quote', async () => {
      mockPrismaRead.quote.findFirst.mockResolvedValue(null);
      await expect(service.getQuoteDetails('user-1', 'invalid')).rejects.toThrow();
    });

    it('returns standard terms and project-specific terms for clients', async () => {
      mockPrismaRead.quote.findFirst.mockResolvedValue({
        ...mockQuote,
        terms: null,
        termsAndConditions: 'Custom deposit clause',
      });
      const result = await service.getQuoteDetails('user-1', 'quote-1');
      expect(result.terms).toContain('Validity');
      expect(result.termsAndConditions).toBe('Custom deposit clause');
    });
  });
});
