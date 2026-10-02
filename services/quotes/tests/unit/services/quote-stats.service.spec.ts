import { QuoteStatsService } from '../../../src/services/quote-stats.service';

describe('QuoteStatsService', () => {
  let service: QuoteStatsService;
  let mockPrismaRead: any;

  beforeEach(() => {
    mockPrismaRead = {
      quote: {
        findMany: jest.fn().mockResolvedValue([
          { status: 'SENT', totalAmount: 5000 },
          { status: 'ACCEPTED', totalAmount: 10000 },
          { status: 'DECLINED', totalAmount: 3000 },
        ]),
      },
    };
    service = new QuoteStatsService(mockPrismaRead);
  });

  describe('getUserStats', () => {
    it('should return user-specific stats', async () => {
      const result = await service.getUserStats('user-1');
      expect(result.total).toBe(3);
      expect(result.byStatus).toBeDefined();
    });

    it('should handle empty quotes', async () => {
      mockPrismaRead.quote.findMany.mockResolvedValue([]);
      const result = await service.getUserStats('user-1');
      expect(result.total).toBe(0);
    });
  });

  describe('getOverallStats', () => {
    it('should return overall stats with acceptance rate', async () => {
      const result = await service.getOverallStats();
      expect(result.total).toBe(3);
      expect(result.totalAcceptedValue).toBe(10000);
      expect(result.acceptanceRate).toBeCloseTo(1 / 3);
    });

    it('should handle zero quotes', async () => {
      mockPrismaRead.quote.findMany.mockResolvedValue([]);
      const result = await service.getOverallStats();
      expect(result.acceptanceRate).toBe(0);
    });
  });
});
