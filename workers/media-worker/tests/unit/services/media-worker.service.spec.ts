import { Test, TestingModule } from '@nestjs/testing';
import { MediaWorkerService } from '../../../src/services/media-worker.service';
import { VirusScanProcessor } from '../../../src/processors/virus-scan.processor';
import { ImageResizeProcessor } from '../../../src/processors/image-resize.processor';
import { MetadataExtractorProcessor } from '../../../src/processors/metadata-extractor.processor';
import { ThumbnailGeneratorProcessor } from '../../../src/processors/thumbnail-generator.processor';
import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { ConfigService } from '@nestjs/config';
import { MediaStatus } from '@prisma/client';
import { CacheService } from '@nestlancer/cache';
import { StorageService } from '@nestlancer/storage';
import { QueuePublisherService } from '@nestlancer/queue';

describe('MediaWorkerService', () => {
  let service: MediaWorkerService;
  let virusScan: jest.Mocked<VirusScanProcessor>;
  let imageResize: jest.Mocked<ImageResizeProcessor>;
  let metadataExtractor: jest.Mocked<MetadataExtractorProcessor>;
  let thumbnailGenerator: jest.Mocked<ThumbnailGeneratorProcessor>;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaWorkerService,
        {
          provide: VirusScanProcessor,
          useValue: { scanFile: jest.fn() },
        },
        {
          provide: ImageResizeProcessor,
          useValue: { process: jest.fn() },
        },
        {
          provide: MetadataExtractorProcessor,
          useValue: { extract: jest.fn() },
        },
        {
          provide: ThumbnailGeneratorProcessor,
          useValue: { generate: jest.fn() },
        },
        {
          provide: PrismaWriteService,
          useValue: {
            media: { update: jest.fn(), findUnique: jest.fn() },
            outbox: { create: jest.fn() },
          },
        },
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('nestlancer-private') },
        },
        {
          provide: CacheService,
          useValue: {
            getClient: jest.fn().mockReturnValue({ set: jest.fn().mockResolvedValue('OK') }),
            del: jest.fn().mockResolvedValue(1),
          },
        },
        { provide: StorageService, useValue: { delete: jest.fn().mockResolvedValue(undefined) } },
        {
          provide: QueuePublisherService,
          useValue: { sendToQueue: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<MediaWorkerService>(MediaWorkerService);
    virusScan = module.get(VirusScanProcessor);
    imageResize = module.get(ImageResizeProcessor);
    metadataExtractor = module.get(MetadataExtractorProcessor);
    thumbnailGenerator = module.get(ThumbnailGeneratorProcessor);
    prismaWrite = module.get(PrismaWriteService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processJob', () => {
    it('should successfully process an image', async () => {
      virusScan.scanFile.mockResolvedValue({ isInfected: false });
      metadataExtractor.extract.mockResolvedValue({ width: 100, height: 100 });
      thumbnailGenerator.generate.mockResolvedValue('thumb_key.webp');
      imageResize.process.mockResolvedValue({ small: 'small_key.jpg' });
      prismaWrite.media.update.mockResolvedValue({} as any);
      prismaWrite.media.findUnique.mockResolvedValue({ metadata: {} } as any);

      const job = { mediaId: 'm1', s3Key: 'test.jpg', contentType: 'image/jpeg', uploaderId: 'u1' };

      await service.processJob(job);

      expect(prismaWrite.media.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: { status: MediaStatus.PROCESSING },
      });
      expect(virusScan.scanFile).toHaveBeenCalledWith('test.jpg');
      expect(metadataExtractor.extract).toHaveBeenCalledWith('test.jpg', 'image/jpeg');
      expect(thumbnailGenerator.generate).toHaveBeenCalledWith('test.jpg', 'image/jpeg');
      expect(imageResize.process).toHaveBeenCalledWith('test.jpg', 'nestlancer-private');

      expect(prismaWrite.media.update).toHaveBeenCalledWith({
        where: { id: 'm1' },
        data: {
          status: MediaStatus.READY,
          metadata: {
            width: 100,
            height: 100,
            storageKey: 'test.jpg',
            variants: { small: 'small_key.jpg' },
          },
          urls: { original: 'test.jpg', thumbnail: 'thumb_key.webp' },
        },
      });
    });

    it('should safely quarantine infected files', async () => {
      virusScan.scanFile.mockResolvedValue({ isInfected: true, virusName: 'Test-Virus' });
      prismaWrite.media.update.mockResolvedValue({} as any);
      prismaWrite.media.findUnique.mockResolvedValue({
        uploaderId: 'u2',
        filename: 'bad.exe',
      } as any);
      prismaWrite.outbox.create.mockResolvedValue({} as any);

      const job = {
        mediaId: 'm2',
        s3Key: 'bad.exe',
        contentType: 'application/octet-stream',
        uploaderId: 'u2',
      };

      await service.processJob(job);

      expect(prismaWrite.media.update).toHaveBeenCalledWith({
        where: { id: 'm2' },
        data: { status: MediaStatus.QUARANTINED, metadata: { virus: 'Test-Virus' } },
      });

      // Should not proceed past virus scan
      expect(metadataExtractor.extract).not.toHaveBeenCalled();
      expect(thumbnailGenerator.generate).not.toHaveBeenCalled();
    });

    it('should process non-image without attempting image resize', async () => {
      virusScan.scanFile.mockResolvedValue({ isInfected: false });
      metadataExtractor.extract.mockResolvedValue({ duration: 10 });
      thumbnailGenerator.generate.mockResolvedValue('thumb_vid.webp');
      prismaWrite.media.update.mockResolvedValue({} as any);
      prismaWrite.media.findUnique.mockResolvedValue({ metadata: {} } as any);

      const job = { mediaId: 'm3', s3Key: 'test.mp4', contentType: 'video/mp4', uploaderId: 'u3' };

      await service.processJob(job);

      expect(imageResize.process).not.toHaveBeenCalled();

      expect(prismaWrite.media.update).toHaveBeenCalledWith({
        where: { id: 'm3' },
        data: expect.objectContaining({
          status: MediaStatus.READY,
          metadata: { duration: 10, storageKey: 'test.mp4', variants: {} },
        }),
      });
    });

    it('should mark job as failed on error', async () => {
      prismaWrite.media.update
        .mockResolvedValueOnce({} as any) // PROCESSING
        .mockResolvedValue({} as any); // FAILED
      virusScan.scanFile.mockRejectedValue(new Error('Unknown scanning error'));

      const job = { mediaId: 'm4', s3Key: 'err.jpg', contentType: 'image/jpeg', uploaderId: 'u4' };

      await expect(service.processJob(job)).rejects.toThrow('Unknown scanning error');

      expect(prismaWrite.media.update).toHaveBeenCalledWith({
        where: { id: 'm4' },
        data: { status: MediaStatus.FAILED },
      });
    });
  });
});
