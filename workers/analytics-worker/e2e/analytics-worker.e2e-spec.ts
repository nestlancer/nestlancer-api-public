import { setupApp, teardownApp, getApp } from './setup';
import { AnalyticsConsumer } from '../src/consumers/analytics.consumer';
import { AnalyticsWorkerService } from '../src/services/analytics-worker.service';
import { AggregationService } from '../src/services/aggregation.service';
import { CacheService } from '@nestlancer/cache';
import { LoggerService } from '@nestlancer/logger';
import { AnalyticsJobType, Period } from '../src/interfaces/analytics-job.interface';

describe('Analytics Worker - E2E', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Bootstrap (smoke)', () => {
    it('should bootstrap worker and resolve key services', () => {
      const app = getApp();
      expect(app).toBeDefined();
      expect(app.get(AnalyticsConsumer)).toBeDefined();
      expect(app.get(AnalyticsWorkerService)).toBeDefined();
      expect(app.get(AggregationService)).toBeDefined();
    });
  });

  describe('AnalyticsConsumer - handleJob (E2E)', () => {
    let consumer: AnalyticsConsumer;
    let aggregationService: AggregationService;
    let cacheService: CacheService;

    beforeEach(() => {
      const app = getApp();
      consumer = app.get(AnalyticsConsumer);
      aggregationService = app.get(AggregationService);
      cacheService = app.get(CacheService);
      jest.clearAllMocks();
    });

    it('should process USER_STATS job and save result to cache with exact shape', async () => {
      const mockTotalUsers = [{ _count: { id: 100 } }];
      const mockUsersByRole = [
        { role: 'ADMIN', _count: { id: 60 } },
        { role: 'USER', _count: { id: 40 } },
      ];
      const mockUsersByStatus = [
        { status: 'ACTIVE', _count: { id: 95 } },
        { status: 'PENDING', _count: { id: 5 } },
      ];

      jest
        .spyOn(aggregationService, 'aggregate')
        .mockResolvedValueOnce(mockTotalUsers)
        .mockResolvedValueOnce(mockUsersByRole)
        .mockResolvedValueOnce(mockUsersByStatus);

      const job = {
        type: AnalyticsJobType.USER_STATS,
        period: Period.DAILY,
      };

      await consumer.handleJob(job);

      expect(aggregationService.aggregate).toHaveBeenCalledTimes(3);
      expect(aggregationService.aggregate).toHaveBeenNthCalledWith(1, 'user', [], { id: 'count' });
      expect(aggregationService.aggregate).toHaveBeenNthCalledWith(2, 'user', ['role'], {
        id: 'count',
      });
      expect(aggregationService.aggregate).toHaveBeenNthCalledWith(3, 'user', ['status'], {
        id: 'count',
      });

      expect(cacheService.set).toHaveBeenCalledTimes(2);
      const latestCall = (cacheService.set as jest.Mock).mock.calls.find((call: unknown[]) =>
        String(call[0]).endsWith(':latest'),
      );
      expect(latestCall).toBeDefined();
      const savedResult = latestCall[1];
      expect(savedResult.type).toBe(AnalyticsJobType.USER_STATS);
      expect(savedResult.period).toBe(Period.DAILY);
      expect(savedResult.data).toBeDefined();
      expect(savedResult.data.total).toBe(100);
      expect(savedResult.data.roles).toEqual({ ADMIN: 60, USER: 40 });
      expect(savedResult.data.statuses).toEqual({ ACTIVE: 95, PENDING: 5 });
      expect(savedResult.generatedAt).toBeInstanceOf(Date);
      expect(savedResult.cachedUntil).toBeInstanceOf(Date);
    });

    it('should process PROJECT_STATS job and save result to cache with exact shape', async () => {
      const mockProjectsByStatus = [
        { status: 'ACTIVE', _count: { id: 30 } },
        { status: 'COMPLETED', _count: { id: 10 } },
      ];
      const mockRevenueMetrics = [{ _sum: { amount: 50000 }, _count: { id: 20 } }];

      jest
        .spyOn(aggregationService, 'aggregate')
        .mockResolvedValueOnce(mockProjectsByStatus)
        .mockResolvedValueOnce(mockRevenueMetrics);

      const job = {
        type: AnalyticsJobType.PROJECT_STATS,
        period: Period.WEEKLY,
      };

      await consumer.handleJob(job);

      expect(aggregationService.aggregate).toHaveBeenCalledTimes(2);
      expect(cacheService.set).toHaveBeenCalledTimes(2);
      const latestCall = (cacheService.set as jest.Mock).mock.calls.find((call: unknown[]) =>
        String(call[0]).endsWith(':latest'),
      );
      expect(latestCall).toBeDefined();
      const savedResult = latestCall[1];
      expect(savedResult.type).toBe(AnalyticsJobType.PROJECT_STATS);
      expect(savedResult.period).toBe(Period.WEEKLY);
      expect(savedResult.data.statuses).toEqual({ ACTIVE: 30, COMPLETED: 10 });
      expect(savedResult.data.totalRevenue).toBe(50000);
      expect(savedResult.data.averageValue).toBe(2500);
    });

    it('should log warning and not call processors for unsupported job type', async () => {
      const loggerService = getApp().get(LoggerService);
      const warnSpy = jest.spyOn(loggerService, 'warn');

      const job = {
        type: 'INVALID_TYPE' as AnalyticsJobType,
        period: Period.DAILY,
      };

      await consumer.handleJob(job);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unsupported job type'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('INVALID_TYPE'));
      expect(aggregationService.aggregate).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });
});
