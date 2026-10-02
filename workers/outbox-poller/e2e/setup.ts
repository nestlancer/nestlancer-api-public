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
import { LeaderElectionService } from '../src/services/leader-election.service';

let app: INestApplication;

const queuePublishMock = jest.fn().mockResolvedValue(undefined);
const outboxFindManyMock = jest.fn().mockResolvedValue([]);
const outboxUpdateMock = jest.fn().mockResolvedValue(undefined);
const outboxCountMock = jest.fn().mockResolvedValue(0);
const leaderAcquireLockMock = jest.fn().mockResolvedValue(true);

/** Mock Prisma for E2E; service uses prisma.outbox (model Outbox). */
const mockPrismaWrite: Record<string, unknown> = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $transaction: jest.fn(
    (fn: (tx: unknown) => Promise<unknown>): Promise<unknown> => fn(mockPrismaWrite),
  ),
  outbox: {
    findMany: outboxFindManyMock,
    update: outboxUpdateMock,
    count: outboxCountMock,
  },
};

const mockPrismaRead = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  outbox: {
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
  },
};

export function getQueuePublishMock(): jest.Mock {
  return queuePublishMock;
}

export function getOutboxFindManyMock(): jest.Mock {
  return outboxFindManyMock;
}

export function getOutboxUpdateMock(): jest.Mock {
  return outboxUpdateMock;
}

export function getOutboxCountMock(): jest.Mock {
  return outboxCountMock;
}

export function getLeaderAcquireLockMock(): jest.Mock {
  return leaderAcquireLockMock;
}

export async function setupApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider('QUEUE_OPTIONS')
    .useValue({ url: 'amqp://localhost:5672' })
    .overrideProvider(QueuePublisherService)
    .useValue({ publish: queuePublishMock })
    .overrideProvider(QueueConsumerService)
    .useValue({ consume: jest.fn(), getChannel: jest.fn(), onModuleInit: jest.fn() })
    .overrideProvider(DlqService)
    .useValue({ sendToDlq: jest.fn().mockResolvedValue(undefined) })
    .overrideProvider(PrismaWriteService)
    .useValue(mockPrismaWrite)
    .overrideProvider(PrismaReadService)
    .useValue(mockPrismaRead)
    .overrideProvider(LeaderElectionService)
    .useValue({
      acquireLock: leaderAcquireLockMock,
      releaseLock: jest.fn().mockResolvedValue(undefined),
      isLeader: jest.fn().mockResolvedValue(true),
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
