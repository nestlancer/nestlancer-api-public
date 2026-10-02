import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.e2e'),
});

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuditModule } from '../src/app.module';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { MetricsService } from '@nestlancer/metrics';

let app: INestApplication;

const createManyMock = jest.fn().mockResolvedValue({ count: 0 });

/** Mock Prisma for E2E; tests assert on createMany calls. */
const mockPrismaWriteService: Record<string, unknown> = {
  auditLog: {
    createMany: createManyMock,
  },
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrismaWriteService)),
};

export function getCreateManyMock(): jest.Mock {
  return createManyMock;
}

export async function setupApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AuditModule],
  })
    .overrideProvider(QueuePublisherService)
    .useValue({
      publish: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(QueueConsumerService)
    .useValue({
      consume: jest.fn().mockResolvedValue(undefined),
      getChannel: jest.fn().mockReturnValue({}),
      onModuleInit: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(DlqService)
    .useValue({
      sendToDlq: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(PrismaWriteService)
    .useValue(mockPrismaWriteService)
    .overrideProvider(PrismaReadService)
    .useValue({
      $connect: jest.fn().mockResolvedValue(undefined),
      $disconnect: jest.fn().mockResolvedValue(undefined),
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
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
}

export function getApp(): INestApplication {
  if (!app) {
    throw new Error('App not initialized. Call setupApp() first.');
  }
  return app;
}
