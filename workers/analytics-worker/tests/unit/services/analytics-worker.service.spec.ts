import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsWorkerService } from '../../../src/services/analytics-worker.service';
import { LoggerService } from '@nestlancer/logger';
import { CacheService } from '@nestlancer/cache';
import { AnalyticsJobType } from '../../../src/interfaces/analytics-job.interface';

describe('AnalyticsWorkerService', () => {
  let service: AnalyticsWorkerService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsWorkerService,
        {
          provide: LoggerService,
          useValue: { log: jest.fn() },
        },
        {
          provide: CacheService,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AnalyticsWorkerService>(AnalyticsWorkerService);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLatest', () => {
    it('should get latest analytics result from cache', async () => {
      cacheService.get.mockResolvedValue({ data: 'test' });
      const result = await service.getLatest(AnalyticsJobType.USER_STATS);
      expect(cacheService.get).toHaveBeenCalledWith(
        `analytics:${AnalyticsJobType.USER_STATS.toLowerCase()}:latest`,
      );
      expect(result).toEqual({ data: 'test' });
    });
  });

  describe('saveResult', () => {
    it('should save result and set latest in cache', async () => {
      const result = {
        type: AnalyticsJobType.PROJECT_STATS,
        period: 'monthly',
        data: {},
        generatedAt: new Date(),
        cachedUntil: new Date(Date.now() + 10000), // 10s from now
      } as any;

      await service.saveResult(result);

      expect(cacheService.set).toHaveBeenCalledWith(
        `analytics:${result.type.toLowerCase()}:${result.period.toLowerCase()}`,
        result,
        expect.any(Number), // ttl
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        `analytics:${result.type.toLowerCase()}:latest`,
        result,
      );
    });
  });
});
