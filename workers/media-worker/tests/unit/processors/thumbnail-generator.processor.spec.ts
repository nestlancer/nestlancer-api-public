import { Test, TestingModule } from '@nestjs/testing';
import { ThumbnailGeneratorProcessor } from '../../../src/processors/thumbnail-generator.processor';
import { StorageService } from '@nestlancer/storage';
import { ImageProcessingService } from '../../../src/services/image-processing.service';
import { VideoProcessingService } from '../../../src/services/video-processing.service';
import { LoggerService } from '@nestlancer/logger';
import { ConfigService } from '@nestjs/config';

jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('frame')),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe('ThumbnailGeneratorProcessor', () => {
  let processor: ThumbnailGeneratorProcessor;
  let storage: jest.Mocked<StorageService>;
  let imageService: jest.Mocked<ImageProcessingService>;
  let videoService: jest.Mocked<VideoProcessingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThumbnailGeneratorProcessor,
        {
          provide: StorageService,
          useValue: { download: jest.fn(), upload: jest.fn() },
        },
        {
          provide: ImageProcessingService,
          useValue: { generateThumbnail: jest.fn() },
        },
        {
          provide: VideoProcessingService,
          useValue: { extractFrame: jest.fn() },
        },
        { provide: LoggerService, useValue: { log: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((_key: string, defaultValue?: any) => defaultValue),
          },
        },
      ],
    }).compile();

    processor = module.get<ThumbnailGeneratorProcessor>(ThumbnailGeneratorProcessor);
    storage = module.get(StorageService);
    imageService = module.get(ImageProcessingService);
    videoService = module.get(VideoProcessingService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('generate', () => {
    it('should generate and upload thumbnail for image/ types', async () => {
      const originalBuffer = Buffer.from('original');
      storage.download.mockResolvedValue(originalBuffer);

      const thumbBuffer = Buffer.from('thumb');
      imageService.generateThumbnail.mockResolvedValue(thumbBuffer);

      storage.upload.mockResolvedValue({ url: 'http://test' } as any);

      const result = await processor.generate('image.jpg', 'image/jpeg');

      expect(storage.download).toHaveBeenCalledWith('nestlancer-private', 'image.jpg');
      expect(imageService.generateThumbnail).toHaveBeenCalledWith(originalBuffer);
      expect(storage.upload).toHaveBeenCalledWith(
        'nestlancer-private',
        'thumb_image.webp',
        thumbBuffer,
        'image/webp',
      );

      expect(result).toBe('thumb_image.webp');
    });

    it('should generate a video thumbnail key for video/ types', async () => {
      storage.download.mockResolvedValue(Buffer.from('video'));
      videoService.extractFrame.mockResolvedValue('/tmp/media-worker/thumbnail.jpg');
      imageService.generateThumbnail.mockResolvedValue(Buffer.from('thumb'));
      storage.upload.mockResolvedValue({ url: 'http://test' } as any);

      const result = await processor.generate('video.mp4', 'video/mp4');

      expect(storage.download).toHaveBeenCalledWith('nestlancer-private', 'video.mp4');
      expect(videoService.extractFrame).toHaveBeenCalled();
      expect(result).toBe('thumb_video.webp');
    });

    it('should return null for unknown types without doing anything', async () => {
      const result = await processor.generate('doc.pdf', 'application/pdf');

      expect(result).toBeNull();
      expect(storage.download).not.toHaveBeenCalled();
      expect(storage.upload).not.toHaveBeenCalled();
    });
  });
});
