import {
  setupApp,
  teardownApp,
  getApp,
  getConsumeHandler,
  getMediaUpdateMock,
  getVirusScanMock,
  getMetadataExtractMock,
  getThumbnailGenerateMock,
  getImageResizeProcessMock,
} from './setup';
import { MediaConsumer } from '../src/consumers/media.consumer';
import { MediaWorkerService } from '../src/services/media-worker.service';
import { VirusScanProcessor } from '../src/processors/virus-scan.processor';
import { ImageResizeProcessor } from '../src/processors/image-resize.processor';
import { MetadataExtractorProcessor } from '../src/processors/metadata-extractor.processor';
import { ThumbnailGeneratorProcessor } from '../src/processors/thumbnail-generator.processor';
import { MediaContext, MediaJobType, type MediaJob } from '../src/interfaces/media-job.interface';
import { MediaStatus } from '@prisma/client';

describe('Media Worker - E2E', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('should bootstrap worker and resolve key services', () => {
      const app = getApp();
      expect(app).toBeDefined();
      expect(app.get(MediaConsumer)).toBeDefined();
      expect(app.get(MediaWorkerService)).toBeDefined();
      expect(app.get(VirusScanProcessor)).toBeDefined();
      expect(app.get(ImageResizeProcessor)).toBeDefined();
      expect(app.get(MetadataExtractorProcessor)).toBeDefined();
      expect(app.get(ThumbnailGeneratorProcessor)).toBeDefined();
    });
  });

  describe('MediaWorkerService - processJob (E2E)', () => {
    let service: MediaWorkerService;
    const mediaUpdateMock = getMediaUpdateMock();
    const virusScanMock = getVirusScanMock();
    const metadataExtractMock = getMetadataExtractMock();
    const thumbnailGenerateMock = getThumbnailGenerateMock();
    const imageResizeProcessMock = getImageResizeProcessMock();

    beforeEach(() => {
      service = getApp().get(MediaWorkerService);
      mediaUpdateMock.mockClear();
      mediaUpdateMock.mockResolvedValue({});
      virusScanMock.mockClear();
      virusScanMock.mockResolvedValue({ isInfected: false });
      metadataExtractMock.mockClear();
      metadataExtractMock.mockResolvedValue({ width: 100, height: 100 });
      thumbnailGenerateMock.mockClear();
      thumbnailGenerateMock.mockResolvedValue('thumb_e2e.webp');
      imageResizeProcessMock.mockClear();
      imageResizeProcessMock.mockResolvedValue({ small: 'small_key', medium: 'medium_key' });
    });

    it('should update status to PROCESSING then READY with metadata and thumbnail when job is valid image', async () => {
      const job: MediaJob = {
        type: MediaJobType.IMAGE_PROCESS,
        mediaId: 'e2e-media-1',
        s3Key: 'uploads/e2e/test.png',
        contentType: 'image/png',
        context: MediaContext.PORTFOLIO,
        userId: 'e2e-user-1',
      };

      await service.processJob(job);

      expect(mediaUpdateMock).toHaveBeenCalledTimes(2);
      expect(mediaUpdateMock).toHaveBeenNthCalledWith(1, {
        where: { id: 'e2e-media-1' },
        data: { status: MediaStatus.PROCESSING },
      });
      expect(mediaUpdateMock).toHaveBeenNthCalledWith(2, {
        where: { id: 'e2e-media-1' },
        data: {
          status: MediaStatus.READY,
          metadata: {
            width: 100,
            height: 100,
            variants: { small: 'small_key', medium: 'medium_key' },
          },
          urls: { thumbnail: 'thumb_e2e.webp' },
        },
      });
      expect(virusScanMock).toHaveBeenCalledTimes(1);
      expect(virusScanMock).toHaveBeenCalledWith('uploads/e2e/test.png');
      expect(metadataExtractMock).toHaveBeenCalledWith('uploads/e2e/test.png', 'image/png');
      expect(thumbnailGenerateMock).toHaveBeenCalledWith('uploads/e2e/test.png', 'image/png');
      expect(imageResizeProcessMock).toHaveBeenCalledTimes(1);
    });

    it('should update status to QUARANTINED and not call metadata/thumbnail when virus scan returns infected', async () => {
      virusScanMock.mockResolvedValueOnce({ isInfected: true, virusName: 'EICAR-Test' });

      const job: MediaJob = {
        type: MediaJobType.VIRUS_SCAN,
        mediaId: 'e2e-media-2',
        s3Key: 'uploads/e2e/bad.exe',
        contentType: 'application/octet-stream',
        context: MediaContext.PROJECT,
        userId: 'e2e-user-2',
      };

      await service.processJob(job);

      expect(mediaUpdateMock).toHaveBeenCalledTimes(2);
      expect(mediaUpdateMock).toHaveBeenNthCalledWith(1, {
        where: { id: 'e2e-media-2' },
        data: { status: MediaStatus.PROCESSING },
      });
      expect(mediaUpdateMock).toHaveBeenNthCalledWith(2, {
        where: { id: 'e2e-media-2' },
        data: { status: MediaStatus.QUARANTINED, metadata: { virus: 'EICAR-Test' } },
      });
      expect(metadataExtractMock).not.toHaveBeenCalled();
      expect(thumbnailGenerateMock).not.toHaveBeenCalled();
      expect(imageResizeProcessMock).not.toHaveBeenCalled();
    });

    it('should update status to FAILED and rethrow when a processor throws', async () => {
      virusScanMock.mockResolvedValueOnce({ isInfected: false });
      metadataExtractMock.mockRejectedValueOnce(new Error('S3 download failed'));

      const job: MediaJob = {
        type: MediaJobType.IMAGE_PROCESS,
        mediaId: 'e2e-media-3',
        s3Key: 'uploads/e2e/missing.jpg',
        contentType: 'image/jpeg',
        context: MediaContext.AVATAR,
        userId: 'e2e-user-3',
      };

      await expect(service.processJob(job)).rejects.toThrow('S3 download failed');

      expect(mediaUpdateMock).toHaveBeenCalledTimes(2);
      expect(mediaUpdateMock).toHaveBeenNthCalledWith(1, {
        where: { id: 'e2e-media-3' },
        data: { status: MediaStatus.PROCESSING },
      });
      expect(mediaUpdateMock).toHaveBeenNthCalledWith(2, {
        where: { id: 'e2e-media-3' },
        data: { status: MediaStatus.FAILED },
      });
    });

    it('should process video job without calling image resize and still set READY with metadata and thumbnail', async () => {
      metadataExtractMock.mockResolvedValueOnce({ duration: 30 });
      thumbnailGenerateMock.mockResolvedValueOnce('thumb_video_e2e.webp');

      const job: MediaJob = {
        type: MediaJobType.VIDEO_PROCESS,
        mediaId: 'e2e-media-4',
        s3Key: 'uploads/e2e/video.mp4',
        contentType: 'video/mp4',
        context: MediaContext.PROJECT,
        userId: 'e2e-user-4',
      };

      await service.processJob(job);

      expect(mediaUpdateMock).toHaveBeenCalledTimes(2);
      expect(mediaUpdateMock).toHaveBeenNthCalledWith(2, {
        where: { id: 'e2e-media-4' },
        data: {
          status: MediaStatus.READY,
          metadata: { duration: 30, variants: {} },
          urls: { thumbnail: 'thumb_video_e2e.webp' },
        },
      });
      expect(imageResizeProcessMock).not.toHaveBeenCalled();
    });
  });

  describe('MediaConsumer - message handling (E2E)', () => {
    const mediaUpdateMock = getMediaUpdateMock();
    const virusScanMock = getVirusScanMock();
    const metadataExtractMock = getMetadataExtractMock();
    const thumbnailGenerateMock = getThumbnailGenerateMock();
    const imageResizeProcessMock = getImageResizeProcessMock();

    beforeEach(() => {
      mediaUpdateMock.mockClear();
      mediaUpdateMock.mockResolvedValue({});
      virusScanMock.mockClear();
      virusScanMock.mockResolvedValue({ isInfected: false });
      metadataExtractMock.mockResolvedValue({ width: 200, height: 200 });
      thumbnailGenerateMock.mockResolvedValue('thumb_consumer.webp');
      imageResizeProcessMock.mockResolvedValue({});
    });

    it('should parse valid JSON message and call processJob so media is updated to PROCESSING then READY', async () => {
      const mediaId = 'a0000000-0000-4000-8000-0000000000c1';
      const userId = 'b0000000-0000-4000-8000-0000000000c2';
      const job: MediaJob = {
        type: MediaJobType.IMAGE_PROCESS,
        mediaId,
        s3Key: 'uploads/consume/img.jpg',
        contentType: 'image/jpeg',
        context: MediaContext.BLOG,
        userId,
      };
      const msg = { content: Buffer.from(JSON.stringify(job)) };

      const handler = getConsumeHandler();
      await handler(msg);

      expect(mediaUpdateMock).toHaveBeenCalledTimes(2);
      expect(mediaUpdateMock).toHaveBeenNthCalledWith(1, {
        where: { id: mediaId },
        data: { status: MediaStatus.PROCESSING },
      });
      expect(mediaUpdateMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: mediaId },
          data: expect.objectContaining({ status: MediaStatus.READY }),
        }),
      );
    });

    it('should throw on invalid JSON and not call media update', async () => {
      const msg = { content: Buffer.from('not valid json {{{') };

      const handler = getConsumeHandler();
      await expect(handler(msg)).rejects.toThrow();

      expect(mediaUpdateMock).not.toHaveBeenCalled();
    });
  });
});
