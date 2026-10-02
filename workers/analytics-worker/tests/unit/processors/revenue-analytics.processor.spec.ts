import { Test, TestingModule } from '@nestjs/testing';
import { RevenueAnalyticsProcessor } from '../../../src/processors/revenue-analytics.processor';
import { AggregationService } from '../../../src/services/aggregation.service';
import { AnalyticsWorkerService } from '../../../src/services/analytics-worker.service';
import { LoggerService } from '@nestlancer/logger';
import { AnalyticsJobType } from '../../../src/interfaces/analytics-job.interface';

describe('RevenueAnalyticsProcessor', () => {
  let processor: RevenueAnalyticsProcessor;
  let aggregationService: jest.Mocked<AggregationService>;
  let analyticsWorkerService: jest.Mocked<AnalyticsWorkerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueAnalyticsProcessor,
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

    processor = module.get<RevenueAnalyticsProcessor>(RevenueAnalyticsProcessor);
    aggregationService = module.get(AggregationService);
    analyticsWorkerService = module.get(AnalyticsWorkerService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process and save revenue analytics', async () => {
    aggregationService.aggregate
      .mockResolvedValueOnce([{ method: 'CREDIT_CARD', _sum: { amount: 1000 } }] as any) // methods
      .mockResolvedValueOnce([
        { status: 'COMPLETED', _count: { id: 10 }, _sum: { amount: 1000 } },
      ] as any); // statuses

    await processor.process('monthly');

    expect(aggregationService.aggregate).toHaveBeenCalledTimes(2);
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AnalyticsJobType.REVENUE_REPORT,
        period: 'monthly',
        data: {
          methods: { CREDIT_CARD: 1000 },
          statuses: { COMPLETED: { count: 10, amount: 1000 } },
        },
      }),
    );
  });

  it('should handle empty aggregation results', async () => {
    aggregationService.aggregate.mockResolvedValue([]);
    await processor.process('yearly');
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { methods: {}, statuses: {} },
      }),
    );
  });
});
