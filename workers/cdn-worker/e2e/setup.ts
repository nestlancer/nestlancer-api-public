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
import { CloudflareInvalidationService } from '../src/services/cloudflare-invalidation.service';

let app: INestApplication;

const invalidateMock = jest
  .fn()
  .mockImplementation((paths: string[]) =>
    Promise.resolve({ id: 'e2e-invalidation-1', status: 'completed', paths }),
  );
const purgeAllMock = jest.fn().mockResolvedValue(undefined);

export function getInvalidateMock(): jest.Mock {
  return invalidateMock;
}

export function getPurgeAllMock(): jest.Mock {
  return purgeAllMock;
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
      consume: jest.fn().mockResolvedValue(undefined),
      getChannel: jest.fn().mockReturnValue({}),
      onModuleInit: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(DlqService)
    .useValue({
      sendToDlq: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(CloudflareInvalidationService)
    .useValue({
      invalidate: invalidateMock,
      purgeAll: purgeAllMock,
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
