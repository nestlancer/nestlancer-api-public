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
import { CacheService } from '@nestlancer/cache';
import { AggregationService } from '../src/services/aggregation.service';

let app: INestApplication;

/** Mock aggregation (DB) for E2E; tests configure return values per scenario. */
const mockAggregationService = {
  aggregate: jest.fn().mockResolvedValue([]),
  rawQuery: jest.fn().mockResolvedValue([]),
};

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
      consume: jest.fn().mockResolvedValue(undefined),
      getChannel: jest.fn().mockReturnValue({}),
      onModuleInit: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(DlqService)
    .useValue({
      sendToDlq: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(CacheService)
    .useValue({
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(AggregationService)
    .useValue(mockAggregationService)
    .overrideProvider(LoggerService)
    .useValue({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
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
