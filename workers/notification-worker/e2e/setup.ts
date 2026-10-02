import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { LoggerService } from '@nestlancer/logger';
import { MetricsService } from '@nestlancer/metrics';
import { RedisPublisherService } from '../src/services/redis-publisher.service';
import { PushProviderService } from '../src/services/push-provider.service';
import { PrismaWriteService } from '@nestlancer/database';

let app: INestApplication;

const redisPublishMock = jest.fn().mockResolvedValue(undefined);
const pushSendNotificationMock = jest.fn().mockResolvedValue(true);
const notificationCreateMock = jest.fn().mockResolvedValue({
  id: 'e2e-notification-1',
  userId: '',
  type: 'IN_APP',
  title: '',
  message: '',
  data: null,
  actionUrl: null,
  priority: 'NORMAL',
  channels: ['IN_APP'],
  createdAt: new Date(),
  readAt: null,
});
const userPushSubscriptionFindManyMock = jest.fn().mockResolvedValue([]);
const userPushSubscriptionDeleteMock = jest.fn().mockResolvedValue(undefined);

/** Handler registered by NotificationConsumer with QueueConsumerService.consume(); used to simulate queue messages. */
let consumeHandler: ((msg: { content: Buffer }) => Promise<void>) | null = null;

const consumeMock = jest
  .fn()
  .mockImplementation(
    (_queueName: string, handler: (msg: { content: Buffer }) => Promise<void>) => {
      consumeHandler = handler;
      return Promise.resolve();
    },
  );

export function getRedisPublishMock(): jest.Mock {
  return redisPublishMock;
}

export function getPushSendNotificationMock(): jest.Mock {
  return pushSendNotificationMock;
}

export function getNotificationCreateMock(): jest.Mock {
  return notificationCreateMock;
}

export function getUserPushSubscriptionFindManyMock(): jest.Mock {
  return userPushSubscriptionFindManyMock;
}

export function getUserPushSubscriptionDeleteMock(): jest.Mock {
  return userPushSubscriptionDeleteMock;
}

/** Invoke the registered queue consumer handler with a message (for E2E consumer tests). */
export function getConsumeHandler(): (msg: { content: Buffer }) => Promise<void> {
  if (!consumeHandler) {
    throw new Error(
      'Consume handler not registered. Ensure setupApp() has run and NotificationConsumer.onModuleInit was called.',
    );
  }
  return consumeHandler;
}

export async function setupApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(QueuePublisherService)
    .useValue({
      publish: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(QueueConsumerService)
    .useValue({
      consume: consumeMock,
      getChannel: jest.fn().mockReturnValue({}),
      onModuleInit: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(DlqService)
    .useValue({
      sendToDlq: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(RedisPublisherService)
    .useValue({
      publish: redisPublishMock,
    })
    .overrideProvider(PushProviderService)
    .useValue({
      sendNotification: pushSendNotificationMock,
    })
    .overrideProvider(PrismaWriteService)
    .useValue({
      notification: { create: notificationCreateMock },
      userPushSubscription: {
        findMany: userPushSubscriptionFindManyMock,
        delete: userPushSubscriptionDeleteMock,
      },
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(null)),
    } as any)
    .overrideProvider(LoggerService)
    .useValue({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    })
    .overrideProvider(MetricsService)
    .useValue({
      incrementCounter: jest.fn(),
      setGauge: jest.fn(),
      observeHistogram: jest.fn(),
      createCounter: jest
        .fn()
        .mockReturnValue({ inc: jest.fn(), labels: jest.fn().mockReturnThis() }),
      createHistogram: jest
        .fn()
        .mockReturnValue({ observe: jest.fn(), labels: jest.fn().mockReturnThis() }),
      createGauge: jest
        .fn()
        .mockReturnValue({ set: jest.fn(), labels: jest.fn().mockReturnThis() }),
    })
    .compile();

  app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

export async function teardownApp(): Promise<void> {
  if (app) {
    await app.close();
  }
  consumeHandler = null;
}

export function getApp(): INestApplication {
  if (!app) {
    throw new Error('App not initialized. Call setupApp() first.');
  }
  return app;
}
