import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../src/app.module';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { NotificationWorkerService } from '../../src/services/notification-worker.service';
import { RedisPublisherService } from '../../src/services/redis-publisher.service';
import { PushProviderService } from '../../src/services/push-provider.service';
import { InAppNotificationProcessor } from '../../src/processors/in-app-notification.processor';
import { NotificationConsumer } from '../../src/consumers/notification.consumer';

describe('AppModule (Integration)', () => {
  let app: any;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('QUEUE_OPTIONS')
      .useValue({ url: 'amqp://localhost' })
      .overrideProvider(QueuePublisherService)
      .useValue({})
      .overrideProvider(QueueConsumerService)
      .useValue({ consume: jest.fn() })
      .overrideProvider(DlqService)
      .useValue({})
      .overrideProvider(PrismaWriteService)
      .useValue({
        notification: { create: jest.fn() },
        userPushSubscription: { findMany: jest.fn(), delete: jest.fn() },
      })
      .overrideProvider(PrismaReadService)
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

    it('should load notification configuration', () => {
      const configService = app.get(ConfigService);
      expect(configService).toBeDefined();
      const notificationConfig = configService.get('notificationWorker');
      expect(notificationConfig).toBeDefined();
    });

    it('should resolve all notification processors and services', () => {
      const providers = [
        NotificationWorkerService,
        RedisPublisherService,
        PushProviderService,
        InAppNotificationProcessor,
        NotificationConsumer,
      ];

      for (const provider of providers) {
        const instance = app.get(provider);
        expect(instance).toBeDefined();
      }
    });

    it('should configure RabbitMQ correctly based on config', () => {
      const configService = app.get(ConfigService);
      const queueUrl = configService.get('notificationWorker.rabbitmq.url');
      expect(queueUrl).not.toBeNull();
    });
  });
});
