import './integration.env';

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';

import { AppModule } from '../../src/app.module';
import { LeaderElectionService } from '../../src/services/leader-election.service';
import { OutboxPollerService } from '../../src/services/outbox-poller.service';
import { OutboxPublisherService } from '../../src/services/outbox-publisher.service';
import { StaleEventMonitorService } from '../../src/services/stale-event-monitor.service';

describe('AppModule (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(25000);

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('QUEUE_OPTIONS')
      .useValue({ url: 'amqp://localhost:5672' })
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
        outbox: { findMany: jest.fn(), update: jest.fn(), count: jest.fn().mockResolvedValue(0) },
      })
      .overrideProvider(PrismaReadService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        outbox: { findMany: jest.fn() },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 15000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 20000);

  describe('Configuration & Dependencies', () => {
    it('should initialize the worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule dependencies', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });

    it('should load outbox poller configuration', () => {
      const configService = app.get(ConfigService);
      expect(configService).toBeDefined();
      const outboxConfig = configService.get('outbox');
      expect(outboxConfig).toBeDefined();
    });

    it('should resolve all outbox poller services', () => {
      const providers = [
        OutboxPollerService,
        OutboxPublisherService,
        LeaderElectionService,
        StaleEventMonitorService,
      ];

      for (const provider of providers) {
        const instance = app.get(provider);
        expect(instance).toBeDefined();
      }
    });

    it('should register RabbitMQ connection correctly', () => {
      const configService = app.get(ConfigService);
      const rabbitUrl = configService.get('RABBITMQ_URL');
      expect(rabbitUrl).not.toBeNull();
    });
  });
});
