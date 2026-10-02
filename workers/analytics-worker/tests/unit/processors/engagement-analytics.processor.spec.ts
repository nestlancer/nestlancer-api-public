import { Test, TestingModule } from '@nestjs/testing';
import { EngagementAnalyticsProcessor } from '../../../src/processors/engagement-analytics.processor';
import { AggregationService } from '../../../src/services/aggregation.service';
import { AnalyticsWorkerService } from '../../../src/services/analytics-worker.service';
import { LoggerService } from '@nestlancer/logger';
import { AnalyticsJobType } from '../../../src/interfaces/analytics-job.interface';

describe('EngagementAnalyticsProcessor', () => {
  let processor: EngagementAnalyticsProcessor;
  let aggregationService: jest.Mocked<AggregationService>;
  let analyticsWorkerService: jest.Mocked<AnalyticsWorkerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngagementAnalyticsProcessor,
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

    processor = module.get<EngagementAnalyticsProcessor>(EngagementAnalyticsProcessor);
    aggregationService = module.get(AggregationService);
    analyticsWorkerService = module.get(AnalyticsWorkerService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process and save engagement analytics', async () => {
    aggregationService.aggregate
      .mockResolvedValueOnce([{ _count: { id: 50 } }] as any) // messages
      .mockResolvedValueOnce([{ _count: { id: 20 } }] as any); // notifications

    await processor.process('weekly');

    expect(aggregationService.aggregate).toHaveBeenCalledTimes(2);
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AnalyticsJobType.ENGAGEMENT_METRICS,
        period: 'weekly',
        data: { messagesCount: 50, notificationsCount: 20 },
      }),
    );
  });

  it('should handle empty aggregation results', async () => {
    aggregationService.aggregate.mockResolvedValue([]);
    await processor.process('monthly');
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { messagesCount: 0, notificationsCount: 0 },
      }),
    );
  });
});
