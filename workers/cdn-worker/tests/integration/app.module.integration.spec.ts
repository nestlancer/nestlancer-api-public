import './integration.env';

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';

import { AppModule } from '../../src/app.module';
import { CdnConsumer } from '../../src/consumers/cdn.consumer';
import { BatchInvalidationProcessor } from '../../src/processors/batch-invalidation.processor';
import { PathInvalidationProcessor } from '../../src/processors/path-invalidation.processor';
import { BatchCollectorService } from '../../src/services/batch-collector.service';
import { CdnWorkerService } from '../../src/services/cdn-worker.service';
import { CloudflareInvalidationService } from '../../src/services/cloudflare-invalidation.service';

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

    it('should load cdn configuration', () => {
      const configService = app.get(ConfigService);
      expect(configService).toBeDefined();
      const cdnConfig = configService.get('cdn');
      expect(cdnConfig).toBeDefined();
    });

    it('should resolve all cdn processors and services', () => {
      const providers = [
        CdnWorkerService,
        CloudflareInvalidationService,
        BatchCollectorService,
        CdnConsumer,
        PathInvalidationProcessor,
        BatchInvalidationProcessor,
      ];

      for (const provider of providers) {
        const instance = app.get(provider);
        expect(instance).toBeDefined();
      }
    });
  });
});
