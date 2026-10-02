import { Test, TestingModule } from '@nestjs/testing';
import { MetadataExtractorProcessor } from '../../../src/processors/metadata-extractor.processor';
import { StorageService } from '@nestlancer/storage';
import { ImageProcessingService } from '../../../src/services/image-processing.service';
import { VideoProcessingService } from '../../../src/services/video-processing.service';
import { LoggerService } from '@nestlancer/logger';
import { ConfigService } from '@nestjs/config';

describe('MetadataExtractorProcessor', () => {
  let processor: MetadataExtractorProcessor;
  let storage: jest.Mocked<StorageService>;
  let imageService: jest.Mocked<ImageProcessingService>;
  let videoService: jest.Mocked<VideoProcessingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetadataExtractorProcessor,
        {
          provide: StorageService,
          useValue: { download: jest.fn() },
        },
        {
          provide: ImageProcessingService,
          useValue: { extractMetadata: jest.fn() },
        },
        {
          provide: VideoProcessingService,
          useValue: {}, // Add mock methods if they are implemented
        },
        { provide: LoggerService, useValue: { debug: jest.fn(), warn: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((_key: string, defaultValue?: any) => defaultValue),
          },
        },
      ],
    }).compile();

    processor = module.get<MetadataExtractorProcessor>(MetadataExtractorProcessor);
    storage = module.get(StorageService);
    imageService = module.get(ImageProcessingService);
    videoService = module.get(VideoProcessingService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('extract', () => {
    it('should extract metadata for image/ types', async () => {
      const buffer = Buffer.from('test');
      storage.download.mockResolvedValue(buffer);
      const mockMetadata = { format: 'jpeg', width: 800, height: 600 };
      imageService.extractMetadata.mockResolvedValue(mockMetadata);

      const result = await processor.extract('test.jpg', 'image/jpeg');

      expect(storage.download).toHaveBeenCalledWith('nestlancer-private', 'test.jpg');
      expect(imageService.extractMetadata).toHaveBeenCalledWith(buffer);
      expect(result).toEqual(mockMetadata);
    });

    it('should return placeholder for video/ types', async () => {
      storage.download.mockResolvedValue(Buffer.from('video'));
      (videoService as any).getInfo = jest.fn().mockRejectedValue(new Error('probe failed'));

      const result = await processor.extract('test.mp4', 'video/mp4');

      expect(result).toEqual({ duration: 0 });
      expect(storage.download).toHaveBeenCalled();
    });

    it('should return empty object for unknown types', async () => {
      const result = await processor.extract('test.pdf', 'application/pdf');
      expect(result).toEqual({});
      expect(storage.download).not.toHaveBeenCalled();
    });
  });
});
