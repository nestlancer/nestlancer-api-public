import { Test, TestingModule } from '@nestjs/testing';
import { UserAnalyticsProcessor } from '../../../src/processors/user-analytics.processor';
import { AggregationService } from '../../../src/services/aggregation.service';
import { AnalyticsWorkerService } from '../../../src/services/analytics-worker.service';
import { LoggerService } from '@nestlancer/logger';
import { AnalyticsJobType } from '../../../src/interfaces/analytics-job.interface';

describe('UserAnalyticsProcessor', () => {
  let processor: UserAnalyticsProcessor;
  let aggregationService: jest.Mocked<AggregationService>;
  let analyticsWorkerService: jest.Mocked<AnalyticsWorkerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserAnalyticsProcessor,
        {
          provide: AggregationService,
          useValue: { aggregate: jest.fn() },
        },
        {
          provide: AnalyticsWorkerService,
          useValue: { saveResult: jest.fn() },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<UserAnalyticsProcessor>(UserAnalyticsProcessor);
    aggregationService = module.get(AggregationService);
    analyticsWorkerService = module.get(AnalyticsWorkerService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process and save user analytics', async () => {
    aggregationService.aggregate
      .mockResolvedValueOnce([{ _count: { id: 100 } }] as any) // total
      .mockResolvedValueOnce([
        { role: 'USER', _count: { id: 60 } },
        { role: 'ADMIN', _count: { id: 40 } },
      ] as any) // roles
      .mockResolvedValueOnce([
        { status: 'ACTIVE', _count: { id: 90 } },
        { status: 'SUSPENDED', _count: { id: 10 } },
      ] as any); // statuses

    await processor.process('daily');

    expect(aggregationService.aggregate).toHaveBeenCalledTimes(3);
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AnalyticsJobType.USER_STATS,
        period: 'daily',
        data: {
          total: 100,
          roles: { USER: 60, ADMIN: 40 },
          statuses: { ACTIVE: 90, SUSPENDED: 10 },
        },
      }),
    );
  });

  it('should handle empty aggregation results', async () => {
    aggregationService.aggregate.mockResolvedValue([]);
    await processor.process('weekly');
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { total: 0, roles: {}, statuses: {} },
      }),
    );
  });
});
