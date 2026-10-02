import * as fs from 'fs/promises';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LoggerService } from '@nestlancer/logger';
import { StorageService } from '@nestlancer/storage';

import { ImageProcessingService } from '../services/image-processing.service';
import { VideoProcessingService } from '../services/video-processing.service';

/**
 * Processor responsible for generating preview thumbnails for different media types.
 * Supports generating thumbnails from images and extracting frames from videos via FFmpeg.
 */
@Injectable()
export class ThumbnailGeneratorProcessor {
  constructor(
    private readonly storage: StorageService,
    private readonly imageService: ImageProcessingService,
    private readonly videoService: VideoProcessingService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {}

  private getBucket(): string {
    return (
      this.configService.get<string>('storage.privateBucket') ??
      this.configService.get<string>('media-worker.privateBucket') ??
      'nestlancer-private'
    );
  }

  /**
   * Generates a thumbnail for the specified media file.
   *
   * @param s3Key - The key of the original file
   * @param contentType - MIME type of the original file
   * @returns A promise resolving to the S3 key of the generated thumbnail
   */
  async generate(s3Key: string, contentType: string): Promise<string | null> {
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      return null;
    }

    const bucket = this.getBucket();
    const thumbnailKey = `thumb_${s3Key.replace(/\.[^.]+$/, '')}.webp`;

    if (contentType.startsWith('image/')) {
      const buffer = await this.storage.download(bucket, s3Key);
      const thumbBuffer = await this.imageService.generateThumbnail(buffer);
      await this.storage.upload(bucket, thumbnailKey, thumbBuffer, 'image/webp');
      return thumbnailKey;
    }

    if (contentType.startsWith('video/')) {
      const tempDir = this.configService.get<string>('media-worker.tempDir', '/tmp/media-worker');
      await fs.mkdir(tempDir, { recursive: true });
      const baseName = path.basename(s3Key) || 'video';
      const tempVideoPath = path.join(tempDir, `video-${Date.now()}-${baseName}`);

      try {
        const videoBuffer = await this.storage.download(bucket, s3Key);
        await fs.writeFile(tempVideoPath, videoBuffer);

        const thumbPath = await this.videoService.extractFrame(tempVideoPath, tempDir, 1);
        const thumbBuffer = await fs.readFile(thumbPath);
        const webpBuffer = await this.imageService.generateThumbnail(thumbBuffer);
        await this.storage.upload(bucket, thumbnailKey, webpBuffer, 'image/webp');

        this.logger.log(`[ThumbnailGen] Video thumbnail generated for ${s3Key}`);
        return thumbnailKey;
      } finally {
        await fs.unlink(tempVideoPath).catch(() => {});
        await fs.unlink(path.join(tempDir, 'thumbnail.jpg')).catch(() => {});
      }
    }

    return thumbnailKey;
  }
}
