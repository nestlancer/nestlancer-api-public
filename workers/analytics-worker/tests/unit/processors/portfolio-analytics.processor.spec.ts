import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioAnalyticsProcessor } from '../../../src/processors/portfolio-analytics.processor';
import { AggregationService } from '../../../src/services/aggregation.service';
import { AnalyticsWorkerService } from '../../../src/services/analytics-worker.service';
import { LoggerService } from '@nestlancer/logger';
import { AnalyticsJobType } from '../../../src/interfaces/analytics-job.interface';

describe('PortfolioAnalyticsProcessor', () => {
  let processor: PortfolioAnalyticsProcessor;
  let aggregationService: jest.Mocked<AggregationService>;
  let analyticsWorkerService: jest.Mocked<AnalyticsWorkerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioAnalyticsProcessor,
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

    processor = module.get<PortfolioAnalyticsProcessor>(PortfolioAnalyticsProcessor);
    aggregationService = module.get(AggregationService);
    analyticsWorkerService = module.get(AnalyticsWorkerService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process and save portfolio analytics', async () => {
    aggregationService.aggregate.mockResolvedValue([
      { _sum: { viewCount: 500, likeCount: 150 }, _count: { id: 25 } },
    ] as any);

    await processor.process('monthly');

    expect(aggregationService.aggregate).toHaveBeenCalledWith('portfolioItem', [], {
      viewCount: 'sum',
      likeCount: 'sum',
      id: 'count',
    });
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AnalyticsJobType.PORTFOLIO_ANALYTICS,
        period: 'monthly',
        data: { totalViews: 500, totalLikes: 150, itemCount: 25 },
      }),
    );
  });

  it('should handle empty aggregation results', async () => {
    aggregationService.aggregate.mockResolvedValue([]);
    await processor.process('yearly');
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { totalViews: 0, totalLikes: 0, itemCount: 0 },
      }),
    );
  });
});
