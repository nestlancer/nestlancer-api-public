import { Test, TestingModule } from '@nestjs/testing';
import { VideoProcessingService } from '../../../src/services/video-processing.service';
import ffmpeg from 'fluent-ffmpeg';

jest.mock('fluent-ffmpeg');

describe('VideoProcessingService', () => {
  let service: VideoProcessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoProcessingService],
    }).compile();

    service = module.get<VideoProcessingService>(VideoProcessingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getInfo', () => {
    it('should return video metadata', async () => {
      const mockMetadata = {
        streams: [{ codec_type: 'video', width: 1920, height: 1080, codec_name: 'h264' }],
        format: { duration: 120, bit_rate: 5000000 },
      };
      (ffmpeg.ffprobe as jest.Mock).mockImplementation((path, callback) =>
        callback(null, mockMetadata),
      );

      const result = await service.getInfo('test.mp4');

      expect(ffmpeg.ffprobe).toHaveBeenCalledWith('test.mp4', expect.any(Function));
      expect(result).toEqual({
        width: 1920,
        height: 1080,
        duration: 120,
        bitrate: 5000000,
        codec: 'h264',
      });
    });

    it('should reject if ffprobe errors', async () => {
      (ffmpeg.ffprobe as jest.Mock).mockImplementation((path, callback) =>
        callback(new Error('ffprobe error')),
      );
      await expect(service.getInfo('test.mp4')).rejects.toThrow('ffprobe error');
    });
  });

  describe('extractFrame', () => {
    it('should extract frame using ffmpeg', async () => {
      const mockOn = jest.fn();
      const mockScreenshots = jest.fn().mockReturnValue({ on: mockOn });
      (ffmpeg as unknown as jest.Mock).mockReturnValue({ screenshots: mockScreenshots });

      // Simulate end event
      mockOn.mockImplementation((event, callback) => {
        if (event === 'end') callback();
        return { on: mockOn };
      });

      await service.extractFrame('test.mp4', 'out.jpg', 5);

      expect(ffmpeg).toHaveBeenCalledWith('test.mp4');
      expect(mockScreenshots).toHaveBeenCalledWith({
        timestamps: [5],
        filename: 'thumbnail.jpg',
        folder: 'out.jpg',
        size: '300x200',
      });
    });

    it('should reject if frame extraction fails', async () => {
      const mockOn = jest.fn();
      const mockScreenshots = jest.fn().mockReturnValue({ on: mockOn });
      (ffmpeg as unknown as jest.Mock).mockReturnValue({ screenshots: mockScreenshots });

      // Simulate error event
      mockOn.mockImplementation((event, callback) => {
        if (event === 'error') callback(new Error('extract config err'));
        return { on: mockOn };
      });

      await expect(service.extractFrame('test.mp4', 'out.jpg')).rejects.toThrow(
        'extract config err',
      );
    });
  });
});
