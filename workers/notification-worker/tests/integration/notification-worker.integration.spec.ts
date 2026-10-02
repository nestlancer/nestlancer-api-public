import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { NotificationWorkerService } from '../../src/services/notification-worker.service';
import { NotificationConsumer } from '../../src/consumers/notification.consumer';
import { InAppNotificationProcessor } from '../../src/processors/in-app-notification.processor';
import { NotificationRetryService } from '../../src/services/notification-retry.service';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';

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

describe('Notification Worker (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

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
        notification: { create: jest.fn() },
        userPushSubscription: { findMany: jest.fn(), delete: jest.fn() },
      })
      .overrideProvider(PrismaReadService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        notification: { findMany: jest.fn() },
      })
      .overrideProvider(CacheService)
      .useValue({
        getClient: jest
          .fn()
          .mockReturnValue({ get: jest.fn(), set: jest.fn(), del: jest.fn(), publish: jest.fn() }),
      })
      .overrideProvider(NotificationRetryService)
      .useValue({ handleFailure: jest.fn() })
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
    it('should initialize the notification worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });
  });

  describe('Service Resolution', () => {
    it('should resolve NotificationWorkerService', () => {
      const service = app.get(NotificationWorkerService);
      expect(service).toBeDefined();
    });

    it('should resolve NotificationConsumer', () => {
      const consumer = app.get(NotificationConsumer);
      expect(consumer).toBeDefined();
    });

    it('should resolve InAppNotificationProcessor', () => {
      const processor = app.get(InAppNotificationProcessor);
      expect(processor).toBeDefined();
    });
    describe('NotificationWorkerService Logic', () => {
      let service: NotificationWorkerService;
      let inAppProcessor: InAppNotificationProcessor;
      let prisma: PrismaWriteService;

      beforeEach(() => {
        service = app.get(NotificationWorkerService);
        inAppProcessor = app.get(InAppNotificationProcessor);
        prisma = app.get(PrismaWriteService);
      });

      it('should process IN_APP notification through InAppNotificationProcessor', async () => {
        jest.spyOn(inAppProcessor, 'process').mockResolvedValue(undefined);

        const job = {
          userId: 'user-1',
          channels: ['IN_APP'],
          notification: { title: 'Test', message: 'Test Msg' },
        };

        await service.processNotification(job as any);

        expect(inAppProcessor.process).toHaveBeenCalledWith(job);
      });

      it('should handle PUSH notification gracefully even if no tokens found', async () => {
        (prisma.userPushSubscription.findMany as jest.Mock).mockResolvedValue([]);

        const job = {
          userId: 'user-2',
          channels: ['PUSH'],
          notification: { title: 'Alert', message: 'Msg' },
        };

        await service.processNotification(job as any);

        expect(prisma.userPushSubscription.findMany).toHaveBeenCalledWith({
          where: { userId: 'user-2' },
        });
      });
    });

    describe('NotificationConsumer Logic', () => {
      let queueConsumer: QueueConsumerService;
      let service: NotificationWorkerService;

      beforeEach(() => {
        queueConsumer = app.get(QueueConsumerService);
        service = app.get(NotificationWorkerService);
      });

      it('should run consumer callback and trigger service logic', async () => {
        jest.spyOn(service, 'processNotification').mockResolvedValue(undefined);

        const consumer = app.get(NotificationConsumer);
        await consumer.onModuleInit();

        const consumeCalls = (queueConsumer.consume as jest.Mock).mock.calls;
        const callback = consumeCalls[consumeCalls.length - 1][1];

        const payload = {
          type: 'IN_APP',
          userId: 'u1',
          notification: { title: 'Hi', message: 'Body' },
          channels: ['IN_APP'],
        };
        const msg: any = {
          content: Buffer.from(JSON.stringify(payload)),
          fields: { routingKey: 'notification.notification.created' },
        };

        await callback(msg);

        expect(service.processNotification).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'u1',
            notification: expect.objectContaining({ title: 'Hi' }),
          }),
        );
      });
    });
  });
});
