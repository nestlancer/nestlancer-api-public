import { RequestStatsService } from '../../../src/services/request-stats.service';

describe('RequestStatsService', () => {
  let service: RequestStatsService;
  let mockPrismaRead: any;

  beforeEach(() => {
    mockPrismaRead = {
      projectRequest: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'r1', status: 'SUBMITTED', createdAt: new Date() },
          { id: 'r2', status: 'UNDER_REVIEW', createdAt: new Date() },
          { id: 'r3', status: 'DRAFT', createdAt: new Date() },
        ]),
      },
      quote: {
        findMany: jest.fn().mockResolvedValue([
          {
            status: 'SENT',
            createdAt: new Date(Date.now() + 3600000),
            request: { createdAt: new Date() },
          },
        ]),
      },
    };

    service = new RequestStatsService(mockPrismaRead);
  });

  describe('getUserStats', () => {
    it('should return user request statistics', async () => {
      const result = await service.getUserStats('user-1');
      expect(result.total).toBe(3);
      expect(result.open).toBe(2);
      expect(result.byStatus).toBeDefined();
      expect(result.conversionRate).toBeDefined();
    });

    it('should count open requests excluding draft and terminal statuses', async () => {
      mockPrismaRead.projectRequest.findMany.mockResolvedValue([
        { id: 'r1', status: 'DRAFT', createdAt: new Date() },
        { id: 'r2', status: 'CONVERTED_TO_PROJECT', createdAt: new Date() },
        { id: 'r3', status: 'CONVERTED_TO_PROJECT', createdAt: new Date() },
        { id: 'r4', status: 'SUBMITTED', createdAt: new Date() },
      ]);

      const result = await service.getUserStats('user-1');
      expect(result.total).toBe(4);
      expect(result.open).toBe(1);
    });

    it('should calculate average response time', async () => {
      const result = await service.getUserStats('user-1');
      expect(result.averageResponseTime).toBeDefined();
    });

    it('should handle empty requests', async () => {
      mockPrismaRead.projectRequest.findMany.mockResolvedValue([]);
      mockPrismaRead.quote.findMany.mockResolvedValue([]);

      const result = await service.getUserStats('user-1');
      expect(result.total).toBe(0);
      expect(result.conversionRate).toBe(0);
    });
  });

  describe('getOverallStats', () => {
    it('should return overall request statistics', async () => {
      const result = await service.getOverallStats();
      expect(result.total).toBe(3);
      expect(result.byStatus).toBeDefined();
    });
  });
});
