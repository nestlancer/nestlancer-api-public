import { Test, TestingModule } from '@nestjs/testing';
import { ProjectAnalyticsProcessor } from '../../../src/processors/project-analytics.processor';
import { AggregationService } from '../../../src/services/aggregation.service';
import { AnalyticsWorkerService } from '../../../src/services/analytics-worker.service';
import { LoggerService } from '@nestlancer/logger';
import { AnalyticsJobType } from '../../../src/interfaces/analytics-job.interface';

describe('ProjectAnalyticsProcessor', () => {
  let processor: ProjectAnalyticsProcessor;
  let aggregationService: jest.Mocked<AggregationService>;
  let analyticsWorkerService: jest.Mocked<AnalyticsWorkerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectAnalyticsProcessor,
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

    processor = module.get<ProjectAnalyticsProcessor>(ProjectAnalyticsProcessor);
    aggregationService = module.get(AggregationService);
    analyticsWorkerService = module.get(AnalyticsWorkerService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should process and save project analytics', async () => {
    aggregationService.aggregate
      .mockResolvedValueOnce([
        { status: 'ACTIVE', _count: { id: 5 } },
        { status: 'COMPLETED', _count: { id: 10 } },
      ] as any) // projects
      .mockResolvedValueOnce([{ _sum: { amount: 5000 }, _count: { id: 2 } }] as any); // payments

    await processor.process('yearly');

    expect(aggregationService.aggregate).toHaveBeenCalledTimes(2);
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AnalyticsJobType.PROJECT_STATS,
        period: 'yearly',
        data: {
          statuses: { ACTIVE: 5, COMPLETED: 10 },
          totalRevenue: 5000,
          averageValue: 2500,
        },
      }),
    );
  });

  it('should handle zero payments for average value calculation to avoid division by zero', async () => {
    aggregationService.aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ _sum: { amount: 0 }, _count: { id: 0 } }] as any);

    await processor.process('monthly');
    expect(analyticsWorkerService.saveResult).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          statuses: {},
          totalRevenue: 0,
          averageValue: 0,
        },
      }),
    );
  });
});
