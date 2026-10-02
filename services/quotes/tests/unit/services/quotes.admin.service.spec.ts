import { QuotesAdminService } from '../../../src/services/quotes.admin.service';

describe('QuotesAdminService', () => {
  let service: QuotesAdminService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  beforeEach(() => {
    mockPrismaRead = {
      quote: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'q1',
            status: 'SENT',
            totalAmount: 5000,
            currency: 'INR',
            createdAt: new Date(),
            user: { firstName: 'John', email: 'test@example.com' },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue({ id: 'q1', userId: 'user-1', status: 'DRAFT' }),
      },
      projectRequest: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'req-1', userId: 'user-1', user: { clientTier: 'NEW' } }),
      },
    };
    mockPrismaWrite = {
      quote: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'q1',
          status: 'DRAFT',
          requestId: 'req-1',
          request: { userId: 'user-1', title: 'Req' },
        }),
        create: jest
          .fn()
          .mockResolvedValue({ id: 'q-new', status: 'DRAFT', totalAmount: 5000, currency: 'INR' }),
        update: jest.fn().mockResolvedValue({ id: 'q1' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      outbox: { create: jest.fn().mockResolvedValue({}) },
      projectRequest: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'req-copy', userId: 'user-1', title: 'Copy Req' }),
      },
      $transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {
          quote: { update: jest.fn().mockResolvedValue({}) },
          projectRequest: {
            findUnique: jest.fn().mockResolvedValue({ id: 'req-1', status: 'QUOTED' }),
            update: jest.fn().mockResolvedValue({}),
          },
          requestStatusHistory: { create: jest.fn().mockResolvedValue({}) },
          outbox: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      }),
    };
    service = new QuotesAdminService(mockPrismaWrite, mockPrismaRead);
  });

  describe('listQuotes', () => {
    it('should return paginated quotes', async () => {
      const result = await service.listQuotes(1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by userId', async () => {
      await service.listQuotes(1, 10, 'user-1');
      expect(mockPrismaRead.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        }),
      );
    });

    it('should include all statuses by default (no terminal filter)', async () => {
      await service.listQuotes(1, 10);
      expect(mockPrismaRead.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('createQuote', () => {
    it('should create a quote for a valid request', async () => {
      mockPrismaRead.quote.findUnique.mockResolvedValueOnce(null);
      const dto = {
        requestId: 'req-1',
        totalAmount: 5000,
        currency: 'INR',
        validUntil: new Date().toISOString(),
        terms: 'Standard',
        notes: '',
        paymentBreakdown: [{ description: 'Advance', amount: 5000, percentage: 100, dueDate: new Date().toISOString() }],
      };
      const result = await service.createQuote('admin-1', dto as any);
      expect(result.id).toBe('q-new');
      expect(result.status).toBe('draft');
      expect(mockPrismaWrite.outbox.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'QUOTE_CREATED' }),
        }),
      );
    });

    it('should throw for non-existent request', async () => {
      mockPrismaRead.projectRequest.findUnique.mockResolvedValue(null);
      await expect(
        service.createQuote('admin-1', { requestId: 'invalid' } as any),
      ).rejects.toThrow();
    });

    it('should throw when request already has a quote', async () => {
      mockPrismaRead.quote.findUnique.mockResolvedValueOnce({ id: 'existing' });
      await expect(
        service.createQuote('admin-1', {
          requestId: 'req-1',
          totalAmount: 5000,
          currency: 'INR',
          validUntil: new Date().toISOString(),
          terms: 'Standard',
          notes: '',
          paymentBreakdown: [{ description: 'Advance', amount: 5000, percentage: 100, dueDate: new Date().toISOString() }],
        } as any),
      ).rejects.toThrow('Request already has a quote');
    });

    it('should throw when payment breakdown total mismatch', async () => {
      const dto = {
        requestId: 'req-1',
        totalAmount: 5000,
        currency: 'INR',
        validUntil: new Date().toISOString(),
        paymentBreakdown: [{ description: 'Advance', amount: 3000, percentage: 100, dueDate: new Date().toISOString() }],
      };
      await expect(service.createQuote('admin-1', dto as any)).rejects.toThrow();
    });

    it('should throw when percentages do not sum to 100', async () => {
      mockPrismaRead.quote.findUnique.mockResolvedValueOnce(null);
      const dto = {
        requestId: 'req-1',
        totalAmount: 5000,
        currency: 'INR',
        validUntil: new Date().toISOString(),
        paymentBreakdown: [{ description: 'Advance', amount: 5000, percentage: 30, dueDate: new Date().toISOString() }],
      };
      await expect(service.createQuote('admin-1', dto as any)).rejects.toThrow(
        'Payment breakdown percentages must sum to 100',
      );
    });

    it('stores admin-supplied paise totals as-sent even for VIP clients (NL-BUG-PAY-001)', async () => {
      mockPrismaRead.quote.findUnique.mockResolvedValueOnce(null);
      mockPrismaRead.projectRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        userId: 'user-1',
        user: { clientTier: 'VIP' },
      });
      let createdTotal = 0;
      mockPrismaWrite.quote.create.mockImplementation((args: any) => {
        createdTotal = args.data.totalAmount;
        return Promise.resolve({
          id: 'q-vip',
          status: 'DRAFT',
          totalAmount: createdTotal,
          currency: 'INR',
        });
      });

      const result = await service.createQuote('admin-1', {
        requestId: 'req-1',
        totalAmount: 1_000_000, // paise (₹10,000)
        currency: 'INR',
        validUntil: new Date().toISOString(),
        terms: 'Standard',
        notes: '',
        paymentBreakdown: [{ description: 'Advance', amount: 1_000_000, percentage: 100, dueDate: new Date().toISOString() }],
      } as any);

      // Explicit admin totals must not be silently rewritten by VIP tier discount.
      expect(createdTotal).toBe(1_000_000);
      expect(result.totalAmount).toBe(1_000_000);
    });
  });

  describe('sendQuote', () => {
    it('should send a quote successfully', async () => {
      const result = await service.sendQuote('q1');
      expect(result).toBe(true);
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });

    it('should throw for non-existent quote', async () => {
      mockPrismaWrite.quote.findUnique.mockResolvedValue(null);
      await expect(service.sendQuote('invalid')).rejects.toThrow();
    });

    it('should no-op without a second QUOTE_SENT when already SENT (NL-BUG-QUOTE-3)', async () => {
      mockPrismaWrite.quote.findUnique.mockResolvedValue({
        id: 'q1',
        status: 'SENT',
        requestId: 'req-1',
        userId: 'user-1',
      });
      const result = await service.sendQuote('q1');
      expect(result).toBe(true);
      expect(mockPrismaWrite.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('resendQuote', () => {
    it('should emit QUOTE_SENT for an already-sent quote', async () => {
      mockPrismaWrite.quote.findUnique.mockResolvedValue({
        id: 'q1',
        status: 'SENT',
        userId: 'user-1',
      });
      const result = await service.resendQuote('q1');
      expect(result).toBe(true);
      expect(mockPrismaWrite.outbox.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'QUOTE_SENT' }),
        }),
      );
    });
  });
});
