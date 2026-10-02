import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});
// Ensure template path resolves when tests run from repo root or worker dir
if (!process.env.TEMPLATES_PATH) {
  process.env.TEMPLATES_PATH = path.resolve(__dirname, '../src/templates');
}

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { MailService } from '@nestlancer/mail';
import { CacheService } from '@nestlancer/cache';
import { LoggerService } from '@nestlancer/logger';
import { MetricsService } from '@nestlancer/metrics';

let app: INestApplication;

const sendMock = jest.fn().mockResolvedValue({ messageId: 'e2e-message-id' });

/** Handler registered by EmailConsumer with QueueConsumerService.consume(); used to simulate queue messages. */
let consumeHandler: ((msg: { content: Buffer }) => Promise<void>) | null = null;

const consumeMock = jest
  .fn()
  .mockImplementation(
    (_queueName: string, handler: (msg: { content: Buffer }) => Promise<void>) => {
      consumeHandler = handler;
      return Promise.resolve();
    },
  );

const sendToDlqMock = jest.fn().mockResolvedValue(undefined);
const sendToQueueMock = jest.fn().mockResolvedValue(undefined);

export function getSendMock(): jest.Mock {
  return sendMock;
}

/** Invoke the registered queue consumer handler with a message (for E2E consumer tests). */
export function getConsumeHandler(): (msg: { content: Buffer }) => Promise<void> {
  if (!consumeHandler) {
    throw new Error(
      'Consume handler not registered. Ensure setupApp() has run and EmailConsumer.onModuleInit was called.',
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
      sendToQueue: sendToQueueMock,
    })
    .overrideProvider(QueueConsumerService)
    .useValue({
      consume: consumeMock,
      getChannel: jest.fn().mockReturnValue({}),
      onModuleInit: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(DlqService)
    .useValue({
      sendToDlq: sendToDlqMock,
    })
    .overrideProvider('MAIL_OPTIONS')
    .useValue({
      provider: 'smtp',
      smtp: {},
      zeptomail: {},
      from: 'Test <test@example.com>',
    })
    .overrideProvider(CacheService)
    .useValue({
      onModuleInit: jest.fn().mockResolvedValue(undefined),
      onModuleDestroy: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(false),
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(undefined),
      invalidateByTag: jest.fn().mockResolvedValue(undefined),
      tagKey: jest.fn().mockResolvedValue(undefined),
      getClient: jest.fn(),
    })
    .overrideProvider(MailService)
    .useValue({
      send: sendMock,
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

export function getSendToDlqMock(): jest.Mock {
  return sendToDlqMock;
}

export function getSendToQueueMock(): jest.Mock {
  return sendToQueueMock;
}
