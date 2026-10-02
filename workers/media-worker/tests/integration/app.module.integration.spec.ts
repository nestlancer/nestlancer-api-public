import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../src/app.module';
import { MediaConsumer } from '../../src/consumers/media.consumer';
import { MediaWorkerService } from '../../src/services/media-worker.service';
import { ImageProcessingService } from '../../src/services/image-processing.service';
import { VideoProcessingService } from '../../src/services/video-processing.service';
import { VirusScanProcessor } from '../../src/processors/virus-scan.processor';
import { ImageResizeProcessor } from '../../src/processors/image-resize.processor';
import { ThumbnailGeneratorProcessor } from '../../src/processors/thumbnail-generator.processor';
import { MetadataExtractorProcessor } from '../../src/processors/metadata-extractor.processor';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { PrismaWriteService } from '@nestlancer/database';
import { StorageService } from '@nestlancer/storage';

describe('AppModule (Integration)', () => {
  let app: any;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('QUEUE_OPTIONS')
      .useValue({})
      .overrideProvider(QueuePublisherService)
      .useValue({})
      .overrideProvider(QueueConsumerService)
      .useValue({ consume: jest.fn() })
      .overrideProvider(DlqService)
      .useValue({})
      .overrideProvider(PrismaWriteService)
      .useValue({
        media: { update: jest.fn() },
      })
      .overrideProvider(StorageService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Configuration & Dependencies', () => {
    it('should initialize the worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule dependencies', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });

    it('should load media configuration', () => {
      const configService = app.get(ConfigService);
      expect(configService).toBeDefined();
      const mediaConfig = configService.get('media-worker');
      expect(mediaConfig).toBeDefined();
    });

    it('should resolve all media processors and services', () => {
      const providers = [
        MediaConsumer,
        MediaWorkerService,
        ImageProcessingService,
        VideoProcessingService,
        VirusScanProcessor,
        ImageResizeProcessor,
        ThumbnailGeneratorProcessor,
        MetadataExtractorProcessor,
      ];

      for (const provider of providers) {
        const instance = app.get(provider);
        expect(instance).toBeDefined();
      }
    });
  });
});
