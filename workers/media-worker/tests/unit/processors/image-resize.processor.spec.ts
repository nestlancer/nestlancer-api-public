import { Test, TestingModule } from '@nestjs/testing';
import { ImageResizeProcessor } from '../../../src/processors/image-resize.processor';
import { ImageProcessingService } from '../../../src/services/image-processing.service';
import { StorageService } from '@nestlancer/storage';
import { ConfigService } from '@nestjs/config';

describe('ImageResizeProcessor', () => {
  let processor: ImageResizeProcessor;
  let imageService: jest.Mocked<ImageProcessingService>;
  let storage: jest.Mocked<StorageService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImageResizeProcessor,
        {
          provide: ImageProcessingService,
          useValue: { resize: jest.fn() },
        },
        {
          provide: StorageService,
          useValue: { download: jest.fn(), upload: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get<ImageResizeProcessor>(ImageResizeProcessor);
    imageService = module.get(ImageProcessingService);
    storage = module.get(StorageService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should process image and create variants based on config', async () => {
      const mockVariants = [
        { name: 'small', width: 100, height: 100 },
        { name: 'medium', width: 500 },
      ];

      configService.get.mockReturnValue(mockVariants);

      const originalBuffer = Buffer.from('original');
      storage.download.mockResolvedValue(originalBuffer);

      const resizedBuffer = Buffer.from('resized');
      imageService.resize.mockResolvedValue(resizedBuffer);

      storage.upload.mockResolvedValue({ url: 'http://test' } as any);

      const result = await processor.process('test.jpg', 'test-bucket');

      expect(configService.get).toHaveBeenCalledWith('media-worker.imageVariants', []);
      expect(storage.download).toHaveBeenCalledWith('test-bucket', 'test.jpg');

      // Should be called for each variant
      expect(imageService.resize).toHaveBeenCalledTimes(2);
      expect(imageService.resize).toHaveBeenCalledWith(originalBuffer, mockVariants[0]);
      expect(imageService.resize).toHaveBeenCalledWith(originalBuffer, mockVariants[1]);

      expect(storage.upload).toHaveBeenCalledTimes(2);
      expect(storage.upload).toHaveBeenCalledWith(
        'test-bucket',
        'small_test.jpg',
        resizedBuffer,
        'image/webp',
      );
      expect(storage.upload).toHaveBeenCalledWith(
        'test-bucket',
        'medium_test.jpg',
        resizedBuffer,
        'image/webp',
      );

      expect(result).toEqual({ small: 'small_test.jpg', medium: 'medium_test.jpg' });
    });

    it('should return empty object if no variants configured', async () => {
      configService.get.mockReturnValue([]);
      const originalBuffer = Buffer.from('original');
      storage.download.mockResolvedValue(originalBuffer);

      const result = await processor.process('test.jpg', 'test-bucket');

      expect(imageService.resize).not.toHaveBeenCalled();
      expect(storage.upload).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });
  });
});
