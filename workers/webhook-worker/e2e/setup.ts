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
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { MetricsService } from '@nestlancer/metrics';

let app: INestApplication;

const webhookLogUpdateMock = jest.fn().mockResolvedValue(undefined);
const paymentFindFirstMock = jest.fn().mockResolvedValue(null);
const paymentUpdateMock = jest.fn().mockResolvedValue(undefined);
const queuePublishMock = jest.fn().mockResolvedValue(undefined);

/** Handler registered by WebhookConsumer with QueueConsumerService.consume(); used to simulate queue messages. */
let consumeHandler: ((msg: { content: Buffer }) => Promise<void>) | null = null;

const mockAmqpChannel = {
  assertQueue: jest.fn().mockResolvedValue(undefined),
  prefetch: jest.fn().mockResolvedValue(undefined),
  ack: jest.fn(),
  nack: jest.fn(),
};

const consumeMock = jest
  .fn()
  .mockImplementation(
    (_queueName: string, handler: (msg: { content: Buffer }) => Promise<void>) => {
      consumeHandler = handler;
      return Promise.resolve();
    },
  );

export function getWebhookLogUpdateMock(): jest.Mock {
  return webhookLogUpdateMock;
}

export function getPaymentFindFirstMock(): jest.Mock {
  return paymentFindFirstMock;
}

export function getPaymentUpdateMock(): jest.Mock {
  return paymentUpdateMock;
}

export function getQueuePublishMock(): jest.Mock {
  return queuePublishMock;
}

/** Invoke the registered queue consumer handler with a message (for E2E consumer tests). */
export function getConsumeHandler(): (msg: { content: Buffer }) => Promise<void> {
  if (!consumeHandler) {
    throw new Error(
      'Consume handler not registered. Ensure setupApp() has run and WebhookConsumer.onModuleInit was called.',
    );
  }
  return consumeHandler;
}

export async function setupApp(): Promise<INestApplication> {
  const mockPrismaWrite = {
    webhookLog: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: webhookLogUpdateMock,
    },
    payment: { findFirst: paymentFindFirstMock, update: paymentUpdateMock },
    refund: { findFirst: jest.fn().mockResolvedValue(null) },
    dispute: { create: jest.fn().mockResolvedValue({}) },
    webhookDelivery: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg as Promise<unknown>[]) : Promise.resolve(arg),
    ),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(QueuePublisherService)
    .useValue({ publish: queuePublishMock })
    .overrideProvider(QueueConsumerService)
    .useValue({
      consume: consumeMock,
      getChannel: jest.fn().mockReturnValue(mockAmqpChannel),
      onModuleInit: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(DlqService)
    .useValue({ sendToDlq: jest.fn().mockResolvedValue(undefined) })
    .overrideProvider(PrismaWriteService)
    .useValue(mockPrismaWrite)
    .overrideProvider(PrismaReadService)
    .useValue({
      webhook: { findUnique: jest.fn().mockResolvedValue(null) },
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
    })
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
