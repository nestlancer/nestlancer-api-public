import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { ConfigService } from '@nestjs/config';
import { HourlyAggregationCron } from '../../src/cron/hourly-aggregation.cron';
import { DailyAggregationCron } from '../../src/cron/daily-aggregation.cron';
import { WeeklyReportCron } from '../../src/cron/weekly-report.cron';
import { UserAnalyticsProcessor } from '../../src/processors/user-analytics.processor';
import { ProjectAnalyticsProcessor } from '../../src/processors/project-analytics.processor';
import { RevenueAnalyticsProcessor } from '../../src/processors/revenue-analytics.processor';
import { PortfolioAnalyticsProcessor } from '../../src/processors/portfolio-analytics.processor';
import { BlogAnalyticsProcessor } from '../../src/processors/blog-analytics.processor';
import { EngagementAnalyticsProcessor } from '../../src/processors/engagement-analytics.processor';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';
import { StorageService } from '@nestlancer/storage';

describe('AppModule (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(QueuePublisherService)
      .useValue({ publish: jest.fn() })
      .overrideProvider(QueueConsumerService)
      .useValue({ consume: jest.fn(), getChannel: jest.fn(), onModuleInit: jest.fn() })
      .overrideProvider(DlqService)
      .useValue({})
      .overrideProvider(PrismaWriteService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        analyticsEvent: { createMany: jest.fn() },
        analyticsAggregation: { upsert: jest.fn() },
      })
      .overrideProvider(PrismaReadService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        analyticsEvent: { findMany: jest.fn() },
        analyticsAggregation: { findMany: jest.fn() },
      })
      .overrideProvider(CacheService)
      .useValue({
        getClient: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn(), del: jest.fn() }),
      })
      .overrideProvider(StorageService)
      .useValue({
        upload: jest.fn(),
        getSignedUrl: jest.fn(),
        delete: jest.fn(),
        exists: jest.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Configuration & Dependencies', () => {
    it('should initialize the worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule dependencies', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });

    it('should load analytics configuration', () => {
      const configService = app.get(ConfigService);
      expect(configService).toBeDefined();
      const analyticsConfig = configService.get('analytics-worker');
      expect(analyticsConfig).toBeDefined();
    });

    it('should resolve scheduled cron jobs', () => {
      const hourlyCron = app.get(HourlyAggregationCron);
      const dailyCron = app.get(DailyAggregationCron);
      const weeklyCron = app.get(WeeklyReportCron);

      expect(hourlyCron).toBeDefined();
      expect(dailyCron).toBeDefined();
      expect(weeklyCron).toBeDefined();
    });

    it('should resolve all analytics processors', () => {
      const processors = [
        UserAnalyticsProcessor,
        ProjectAnalyticsProcessor,
        RevenueAnalyticsProcessor,
        PortfolioAnalyticsProcessor,
        BlogAnalyticsProcessor,
        EngagementAnalyticsProcessor,
      ];

      for (const processor of processors) {
        const instance = app.get(processor);
        expect(instance).toBeDefined();
      }
    });
  });
});
