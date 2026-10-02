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
import { PrismaWriteService } from '@nestlancer/database';
import { StorageService } from '@nestlancer/storage';
import { LoggerService } from '@nestlancer/logger';
import { MetricsService } from '@nestlancer/metrics';
import { VirusScanProcessor } from '../src/processors/virus-scan.processor';
import { MetadataExtractorProcessor } from '../src/processors/metadata-extractor.processor';
import { ThumbnailGeneratorProcessor } from '../src/processors/thumbnail-generator.processor';
import { ImageResizeProcessor } from '../src/processors/image-resize.processor';

let app: INestApplication;

const mediaUpdateMock = jest.fn().mockResolvedValue({});
const virusScanMock = jest.fn().mockResolvedValue({ isInfected: false });
const metadataExtractMock = jest.fn().mockResolvedValue({ width: 100, height: 100 });
const thumbnailGenerateMock = jest.fn().mockResolvedValue('thumb_e2e.webp');
const imageResizeProcessMock = jest
  .fn()
  .mockResolvedValue({ small: 'small_key', medium: 'medium_key' });
const storageDownloadMock = jest.fn().mockResolvedValue(Buffer.from(''));
const storageUploadMock = jest.fn().mockResolvedValue(undefined);

/** Handler registered by MediaConsumer with QueueConsumerService.consume(); used to simulate queue messages. */
let consumeHandler: ((msg: { content: Buffer }) => Promise<void>) | null = null;

const consumeMock = jest
  .fn()
  .mockImplementation(
    (_queueName: string, handler: (msg: { content: Buffer }) => Promise<void>) => {
      consumeHandler = handler;
      return Promise.resolve();
    },
  );

export function getMediaUpdateMock(): jest.Mock {
  return mediaUpdateMock;
}

export function getVirusScanMock(): jest.Mock {
  return virusScanMock;
}

export function getMetadataExtractMock(): jest.Mock {
  return metadataExtractMock;
}

export function getThumbnailGenerateMock(): jest.Mock {
  return thumbnailGenerateMock;
}

export function getImageResizeProcessMock(): jest.Mock {
  return imageResizeProcessMock;
}

/** Invoke the registered queue consumer handler with a message (for E2E consumer tests). */
export function getConsumeHandler(): (msg: { content: Buffer }) => Promise<void> {
  if (!consumeHandler) {
    throw new Error(
      'Consume handler not registered. Ensure setupApp() has run and MediaConsumer.onModuleInit was called.',
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
    .overrideProvider(PrismaWriteService)
    .useValue({
      media: { update: mediaUpdateMock },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    } as any)
    .overrideProvider(StorageService)
    .useValue({
      download: storageDownloadMock,
      upload: storageUploadMock,
      getSignedUrl: jest.fn().mockResolvedValue('https://signed.example.com/key'),
      delete: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(true),
    })
    .overrideProvider(VirusScanProcessor)
    .useValue({
      scanFile: virusScanMock,
    })
    .overrideProvider(MetadataExtractorProcessor)
    .useValue({
      extract: metadataExtractMock,
    })
    .overrideProvider(ThumbnailGeneratorProcessor)
    .useValue({
      generate: thumbnailGenerateMock,
    })
    .overrideProvider(ImageResizeProcessor)
    .useValue({
      process: imageResizeProcessMock,
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
