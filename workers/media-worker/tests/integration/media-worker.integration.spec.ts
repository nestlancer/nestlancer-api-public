import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { MediaWorkerService } from '../../src/services/media-worker.service';
import { MediaConsumer } from '../../src/consumers/media.consumer';
import { VirusScanProcessor } from '../../src/processors/virus-scan.processor';
import { ImageResizeProcessor } from '../../src/processors/image-resize.processor';
import { ThumbnailGeneratorProcessor } from '../../src/processors/thumbnail-generator.processor';
import { MetadataExtractorProcessor } from '../../src/processors/metadata-extractor.processor';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { MediaJobType, MediaContext } from '../../src/interfaces/media-job.interface';
import { StorageService } from '@nestlancer/storage';

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

describe('Media Worker (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
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
        media: { update: jest.fn(), findMany: jest.fn() },
      })
      .overrideProvider(PrismaReadService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        media: { findUnique: jest.fn(), findMany: jest.fn() },
      })
      .overrideProvider(StorageService)
      .useValue({
        upload: jest.fn(),
        getSignedUrl: jest.fn(),
        delete: jest.fn(),
        exists: jest.fn(),
        download: jest.fn(),
      })
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
    it('should initialize the media worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });
  });

  describe('Service Resolution', () => {
    it('should resolve MediaWorkerService', () => {
      const service = app.get(MediaWorkerService);
      expect(service).toBeDefined();
    });

    it('should resolve MediaConsumer', () => {
      const consumer = app.get(MediaConsumer);
      expect(consumer).toBeDefined();
    });

    it('should resolve VirusScanProcessor', () => {
      const processor = app.get(VirusScanProcessor);
      expect(processor).toBeDefined();
    });

    it('should resolve ImageResizeProcessor', () => {
      const processor = app.get(ImageResizeProcessor);
      expect(processor).toBeDefined();
    });

    it('should resolve ThumbnailGeneratorProcessor', () => {
      const processor = app.get(ThumbnailGeneratorProcessor);
      expect(processor).toBeDefined();
    });

    it('should resolve MetadataExtractorProcessor', () => {
      const processor = app.get(MetadataExtractorProcessor);
      expect(processor).toBeDefined();
    });
    describe('MediaWorkerService Pipeline Logic', () => {
      let service: MediaWorkerService;
      let virusScan: VirusScanProcessor;
      let metadataExtractor: MetadataExtractorProcessor;
      let thumbnailGenerator: ThumbnailGeneratorProcessor;
      let imageResize: ImageResizeProcessor;
      let prisma: PrismaWriteService;

      beforeEach(() => {
        service = app.get(MediaWorkerService);
        virusScan = app.get(VirusScanProcessor);
        metadataExtractor = app.get(MetadataExtractorProcessor);
        thumbnailGenerator = app.get(ThumbnailGeneratorProcessor);
        imageResize = app.get(ImageResizeProcessor);
        prisma = app.get(PrismaWriteService);

        (prisma.media.update as jest.Mock).mockClear();
      });

      it('should process a clean image and update status to READY', async () => {
        jest.spyOn(virusScan, 'scanFile').mockResolvedValue({ isInfected: false });
        jest.spyOn(metadataExtractor, 'extract').mockResolvedValue({ width: 800, height: 600 });
        jest.spyOn(thumbnailGenerator, 'generate').mockResolvedValue('thumb-key');
        jest.spyOn(imageResize, 'process').mockResolvedValue({});

        const job = { mediaId: 'media-1', s3Key: 'test.png', contentType: 'image/png' };

        await service.processJob(job as any);

        expect(prisma.media.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: { status: 'PROCESSING' } }),
        );
        expect(prisma.media.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: 'READY', urls: { thumbnail: 'thumb-key' } }),
          }),
        );
      });

      it('should quarantine infected files', async () => {
        jest
          .spyOn(virusScan, 'scanFile')
          .mockResolvedValue({ isInfected: true, virusName: 'EICAR' });

        const job = {
          mediaId: 'media-2',
          s3Key: 'virus.exe',
          contentType: 'application/x-msdownload',
        };

        await service.processJob(job as any);

        expect(prisma.media.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ status: 'QUARANTINED' }),
          }),
        );
      });

      it('should set FAILED status if an error occurs', async () => {
        jest.spyOn(virusScan, 'scanFile').mockRejectedValue(new Error('S3 offline'));

        const job = { mediaId: 'media-3', s3Key: 'test.jpg', contentType: 'image/jpeg' };

        await expect(service.processJob(job as any)).rejects.toThrow('S3 offline');

        expect(prisma.media.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: { status: 'FAILED' } }),
        );
      });
    });

    describe('MediaConsumer Logic', () => {
      let service: MediaWorkerService;
      let queueConsumer: QueueConsumerService;

      beforeEach(() => {
        service = app.get(MediaWorkerService);
        queueConsumer = app.get(QueueConsumerService);
      });

      it('should run consumer callback and trigger service logic', async () => {
        jest.spyOn(service, 'processJob').mockResolvedValue(undefined);

        const consumer = app.get(MediaConsumer);
        await consumer.onModuleInit();

        const consumeCalls = (queueConsumer.consume as jest.Mock).mock.calls;
        const callback = consumeCalls[consumeCalls.length - 1][1];

        const payload = {
          type: MediaJobType.VIDEO_PROCESS,
          mediaId: '550e8400-e29b-41d4-a716-446655440000',
          s3Key: 'rabbit.mp4',
          contentType: 'video/mp4',
          context: MediaContext.PROJECT,
          userId: '550e8400-e29b-41d4-a716-446655440001',
        };
        const msg: any = { content: Buffer.from(JSON.stringify(payload)) };

        await callback(msg);

        expect(service.processJob).toHaveBeenCalledWith(expect.objectContaining(payload));
      });
    });
  });
});
