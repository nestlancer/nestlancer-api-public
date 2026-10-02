import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsConsumer } from '../../src/consumers/analytics.consumer';
import { LoggerService } from '@nestlancer/logger';
import { UserAnalyticsProcessor } from '../../src/processors/user-analytics.processor';
import { ProjectAnalyticsProcessor } from '../../src/processors/project-analytics.processor';
import { RevenueAnalyticsProcessor } from '../../src/processors/revenue-analytics.processor';
import { PortfolioAnalyticsProcessor } from '../../src/processors/portfolio-analytics.processor';
import { BlogAnalyticsProcessor } from '../../src/processors/blog-analytics.processor';
import { EngagementAnalyticsProcessor } from '../../src/processors/engagement-analytics.processor';
import { AnalyticsJobType, Period } from '../../src/interfaces/analytics-job.interface';
import { QueueConsumerService, DlqService } from '@nestlancer/queue';
import { CacheService } from '@nestlancer/cache';

describe('AnalyticsConsumer', () => {
  let consumer: AnalyticsConsumer;
  let userProcessor: UserAnalyticsProcessor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsConsumer,
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), warn: jest.fn() },
        },
        {
          provide: UserAnalyticsProcessor,
          useValue: { process: jest.fn() },
        },
        {
          provide: ProjectAnalyticsProcessor,
          useValue: { process: jest.fn() },
        },
        {
          provide: RevenueAnalyticsProcessor,
          useValue: { process: jest.fn() },
        },
        {
          provide: PortfolioAnalyticsProcessor,
          useValue: { process: jest.fn() },
        },
        {
          provide: BlogAnalyticsProcessor,
          useValue: { process: jest.fn() },
        },
        {
          provide: QueueConsumerService,
          useValue: { consume: jest.fn() },
        },
        {
          provide: DlqService,
          useValue: { sendToDlq: jest.fn() },
        },
        {
          provide: CacheService,
          useValue: {
            getClient: jest.fn().mockReturnValue({ set: jest.fn().mockResolvedValue('OK') }),
            del: jest.fn().mockResolvedValue(1),
          },
        },
        {
          provide: EngagementAnalyticsProcessor,
          useValue: { process: jest.fn() },
        },
      ],
    }).compile();

    consumer = module.get<AnalyticsConsumer>(AnalyticsConsumer);
    userProcessor = module.get<UserAnalyticsProcessor>(UserAnalyticsProcessor);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  it('should route USER_STATS job to UserAnalyticsProcessor', async () => {
    const job = { type: AnalyticsJobType.USER_STATS, period: Period.DAILY };
    await consumer.handleJob(job);
    expect(userProcessor.process).toHaveBeenCalledWith(Period.DAILY);
  });
});
