import { Test, TestingModule } from '@nestjs/testing';
import { ImageProcessingService } from '../../../src/services/image-processing.service';

const toBuffer = jest.fn().mockResolvedValue(Buffer.from('processed'));
const webp = jest.fn().mockReturnValue({ toBuffer });
const resize = jest.fn().mockReturnValue({ toBuffer, webp });
const metadata = jest.fn().mockResolvedValue({
  width: 800,
  height: 600,
  format: 'jpeg',
  space: 'srgb',
});

jest.mock('sharp', () =>
  jest.fn(() => ({
    resize,
    webp,
    metadata,
    toBuffer,
  })),
);

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;

  beforeEach(async () => {
    jest.clearAllMocks();
    toBuffer.mockResolvedValue(Buffer.from('processed'));
    webp.mockReturnValue({ toBuffer });
    resize.mockReturnValue({ toBuffer, webp });
    metadata.mockResolvedValue({
      width: 800,
      height: 600,
      format: 'jpeg',
      space: 'srgb',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageProcessingService],
    }).compile();

    service = module.get<ImageProcessingService>(ImageProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resize', () => {
    it('should resize via sharp', async () => {
      const inputBuffer = Buffer.from('input');
      const variant = { name: 'test', width: 100, height: 100, fit: 'cover' };
      toBuffer.mockResolvedValue(Buffer.from('resized'));

      const result = await service.resize(inputBuffer, variant as any);

      expect(resize).toHaveBeenCalledWith(100, 100, { fit: 'cover' });
      expect(webp).toHaveBeenCalledWith({ quality: 80 });
      expect(result).toEqual(Buffer.from('resized'));
    });
  });

  describe('compress', () => {
    it('should compress via sharp webp', async () => {
      const inputBuffer = Buffer.from('input');
      toBuffer.mockResolvedValue(Buffer.from('compressed'));

      const result = await service.compress(inputBuffer, 85);

      expect(webp).toHaveBeenCalledWith({ quality: 85 });
      expect(result).toEqual(Buffer.from('compressed'));
    });
  });

  describe('extractMetadata', () => {
    it('should extract metadata via sharp', async () => {
      const inputBuffer = Buffer.from('input');

      const result = await service.extractMetadata(inputBuffer);

      expect(metadata).toHaveBeenCalled();
      expect(result).toEqual({
        width: 800,
        height: 600,
        format: 'jpeg',
        colorSpace: 'srgb',
        exif: undefined,
      });
    });
  });

  describe('generateThumbnail', () => {
    it('should generate a webp thumbnail via sharp', async () => {
      const inputBuffer = Buffer.from('input');
      toBuffer.mockResolvedValue(Buffer.from('thumb'));

      const result = await service.generateThumbnail(inputBuffer);

      expect(resize).toHaveBeenCalledWith(300, 200, { fit: 'cover' });
      expect(webp).toHaveBeenCalledWith({ quality: 70 });
      expect(result).toEqual(Buffer.from('thumb'));
    });
  });
});
