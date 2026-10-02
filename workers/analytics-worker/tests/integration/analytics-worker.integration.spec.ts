import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { LoggerService } from '@nestlancer/logger';
import { AnalyticsWorkerService } from '../../src/services/analytics-worker.service';
import { AnalyticsConsumer } from '../../src/consumers/analytics.consumer';
import { UserAnalyticsProcessor } from '../../src/processors/user-analytics.processor';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';
import { StorageService } from '@nestlancer/storage';

function loadDevEnv() {
  const envPath = resolve(__dirname, '../../../../.env.development');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...value] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = value
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });
}

const cacheClientMock = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const cacheServiceMock = {
  getClient: jest.fn().mockReturnValue(cacheClientMock),
  get: cacheClientMock.get,
  set: cacheClientMock.set,
} as any;

describe('Analytics Worker (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

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
        analyticsEvent: { createMany: jest.fn(), create: jest.fn() },
        analyticsAggregation: { upsert: jest.fn(), findMany: jest.fn() },
      })
      .overrideProvider(PrismaReadService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        analyticsEvent: { findMany: jest.fn(), aggregate: jest.fn() },
        analyticsAggregation: { findMany: jest.fn(), findUnique: jest.fn() },
      })
      .overrideProvider(CacheService)
      .useValue(cacheServiceMock)
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
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Module Initialization', () => {
    it('should initialize the analytics worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });
  });

  describe('Service Resolution', () => {
    it('should resolve AnalyticsWorkerService', () => {
      const service = app.get(AnalyticsWorkerService);
      expect(service).toBeDefined();
    });

    it('should resolve AnalyticsConsumer', () => {
      const consumer = app.get(AnalyticsConsumer);
      expect(consumer).toBeDefined();
    });

    it('should resolve UserAnalyticsProcessor', () => {
      const processor = app.get(UserAnalyticsProcessor);
      expect(processor).toBeDefined();
    });
  });

  describe('Queue Subscription Wiring', () => {
    it('should subscribe AnalyticsConsumer to the analytics queue on module init', async () => {
      const queueConsumer = app.get(QueueConsumerService) as any;
      const consumer = app.get(AnalyticsConsumer);

      await consumer.onModuleInit();

      expect(queueConsumer.consume).toHaveBeenCalledWith('analytics.queue', expect.any(Function));
    });
    describe('AnalyticsWorkerService', () => {
      let service: AnalyticsWorkerService;
      let cacheService: CacheService;

      beforeEach(() => {
        service = app.get(AnalyticsWorkerService);
        cacheService = app.get(CacheService);
      });

      it('should calculate TTL and save analytics result to cache using correct keys', async () => {
        const cacheClient = cacheService.getClient();
        const mockResult = {
          type: 'USER_STATS' as any,
          period: 'DAILY' as any,
          data: { active: 100 },
          generatedAt: new Date(),
          cachedUntil: new Date(Date.now() + 3600000), // 1 hour TTL
        };

        await service.saveResult(mockResult);

        expect(cacheClient.set).toHaveBeenCalledWith(
          'analytics:user_stats:daily',
          mockResult,
          expect.any(Number),
        );
        expect(cacheClient.set).toHaveBeenCalledWith('analytics:user_stats:latest', mockResult);
      });

      it('should retrieve the latest analytics result from cache', async () => {
        const cacheClient = cacheService.getClient();
        const mockData = { active: 200 };
        (cacheClient.get as jest.Mock).mockResolvedValueOnce(mockData);

        const result = await service.getLatest('PROJECT_STATS' as any);

        expect(cacheClient.get).toHaveBeenCalledWith('analytics:project_stats:latest');
        expect(result).toEqual(mockData);
      });
    });

    describe('AnalyticsConsumer', () => {
      let consumer: AnalyticsConsumer;
      let userProcessor: UserAnalyticsProcessor;

      beforeEach(() => {
        consumer = app.get(AnalyticsConsumer);
        userProcessor = app.get(UserAnalyticsProcessor);
        jest.spyOn(userProcessor, 'process').mockResolvedValue(undefined);
      });

      it('should route USER_STATS job to UserAnalyticsProcessor', async () => {
        const job = { type: 'USER_STATS' as any, period: 'DAILY' as any };

        await consumer.handleJob(job);

        expect(userProcessor.process).toHaveBeenCalledWith('DAILY');
      });

      it('should log warning for unsupported job types', async () => {
        const logger = app.get(LoggerService);
        const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();

        const job = { type: 'UNKNOWN_TYPE' as any, period: 'DAILY' as any };
        await consumer.handleJob(job);

        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Unsupported job type received: UNKNOWN_TYPE'),
        );
      });
    });
  });
});
