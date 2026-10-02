import { DashboardService } from '../../src/services/dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockCacheService: any;
  let mockRevenueService: any;
  let mockUsersService: any;
  let mockProjectsService: any;
  let mockPerformanceService: any;
  let mockAuditService: any;
  let mockPrismaRead: any;
  let mockHttpService: any;

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    mockRevenueService = {
      getRevenueOverview: jest.fn().mockResolvedValue({
        total: 100000,
        trend: { current: 100000, previous: 80000, change: 25, trend: 'up' },
        chartData: [],
      }),
    };
    mockUsersService = {
      getUserOverview: jest.fn().mockResolvedValue({
        total: 500,
        newThisMonth: 25,
        trend: { current: 25, previous: 20, change: 25, trend: 'up' },
        chartData: [],
      }),
    };
    mockProjectsService = {
      getProjectOverview: jest.fn().mockResolvedValue({
        active: 15,
        completed: 40,
        trend: { current: 15, previous: 10, change: 50, trend: 'up' },
        byStatus: [],
      }),
    };
    mockPerformanceService = {
      getSystemPerformance: jest.fn().mockResolvedValue({ health: { status: 'healthy' } }),
      getAlerts: jest.fn().mockResolvedValue([]),
    };
    mockAuditService = {
      getRecentActivity: jest.fn().mockResolvedValue([]),
    };
    mockPrismaRead = {
      projectRequest: { count: jest.fn().mockResolvedValue(0) },
      quote: { count: jest.fn().mockResolvedValue(0) },
    };
    mockHttpService = {};
    service = new DashboardService(
      mockCacheService,
      mockRevenueService,
      mockUsersService,
      mockProjectsService,
      mockPerformanceService,
      mockAuditService,
      mockPrismaRead,
      mockHttpService,
    );
  });

  describe('getOverview', () => {
    it('should return dashboard overview', async () => {
      const result = await service.getOverview({ period: 'MONTH' } as any);
      expect(result.summary.totalUsers).toBe(500);
      expect(result.summary.revenueThisMonth).toBe(100000);
    });

    it('should use cached data when available', async () => {
      const cached = { summary: { totalUsers: 300 } };
      mockCacheService.get.mockResolvedValue(cached);
      const result = await service.getOverview({ period: 'MONTH' } as any);
      expect(result).toEqual(cached);
      expect(mockRevenueService.getRevenueOverview).not.toHaveBeenCalled();
    });

    it('should cache the result', async () => {
      await service.getOverview({ period: 'MONTH' } as any);
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });
});
