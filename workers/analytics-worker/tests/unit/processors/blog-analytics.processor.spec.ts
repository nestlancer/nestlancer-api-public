import { Test, TestingModule } from '@nestjs/testing';
import { BlogAnalyticsProcessor } from '../../../src/processors/blog-analytics.processor';
import { AggregationService } from '../../../src/services/aggregation.service';
import { AnalyticsWorkerService } from '../../../src/services/analytics-worker.service';
import { LoggerService } from '@nestlancer/logger';
import { AnalyticsJobType } from '../../../src/interfaces/analytics-job.interface';

describe('BlogAnalyticsProcessor', () => {
  let processor: BlogAnalyticsProcessor;
  let aggregationService: jest.Mocked<AggregationService>;
  let analyticsWorkerService: jest.Mocked<AnalyticsWorkerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlogAnalyticsProcessor,
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

    processor = module.get<BlogAnalyticsProcessor>(BlogAnalyticsProcessor);
    aggregationService = module.get(AggregationService);
    analyticsWorkerService = module.get(AnalyticsWorkerService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process and save blog analytics', async () => {
    aggregationService.aggregate.mockResolvedValue([
      { _sum: { viewCount: 100, likeCount: 50 }, _count: { id: 10 } },
    ] as any);

    await processor.process('daily');

    expect(aggregationService.aggregate).toHaveBeenCalledWith('blogPost', [], {
      viewCount: 'sum',
      likeCount: 'sum',
      id: 'count',
    });
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AnalyticsJobType.BLOG_ANALYTICS,
        period: 'daily',
        data: { totalViews: 100, totalLikes: 50, postCount: 10 },
      }),
    );
  });

  it('should handle empty aggregation results', async () => {
    aggregationService.aggregate.mockResolvedValue([]);
    await processor.process('weekly');
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { totalViews: 0, totalLikes: 0, postCount: 0 },
      }),
    );
  });
});
