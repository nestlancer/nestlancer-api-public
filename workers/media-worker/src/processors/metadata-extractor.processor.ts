import * as fs from 'fs/promises';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LoggerService } from '@nestlancer/logger';
import { StorageService } from '@nestlancer/storage';

import { MediaMetadata } from '../interfaces/processing-options.interface';
import { ImageProcessingService } from '../services/image-processing.service';
import { VideoProcessingService } from '../services/video-processing.service';

/**
 * Processor responsible for extracting technical metadata from media files.
 * Supports image properties (dimensions, EXIF) and video properties (duration, resolution) via FFmpeg.
 */
@Injectable()
export class MetadataExtractorProcessor {
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
   * Extracts metadata based on the media content type.
   *
   * @param s3Key - The key of the file in storage
   * @param contentType - The MIME type of the file
   * @returns A promise resolving to the extracted metadata object
   */
  async extract(s3Key: string, contentType: string): Promise<MediaMetadata> {
    const bucket = this.getBucket();

    if (contentType.startsWith('image/')) {
      const buffer = await this.storage.download(bucket, s3Key);
      return this.imageService.extractMetadata(buffer);
    }

    if (contentType.startsWith('video/')) {
      const tempDir = this.configService.get<string>('media-worker.tempDir', '/tmp/media-worker');
      await fs.mkdir(tempDir, { recursive: true });
      const baseName = path.basename(s3Key) || 'video';
      const tempVideoPath = path.join(tempDir, `video-meta-${Date.now()}-${baseName}`);

      try {
        const videoBuffer = await this.storage.download(bucket, s3Key);
        await fs.writeFile(tempVideoPath, videoBuffer);
        const metadata = await this.videoService.getInfo(tempVideoPath);
        this.logger.debug(`[MetadataExtractor] Video metadata extracted for ${s3Key}`);
        return metadata;
      } catch (err: any) {
        this.logger.warn(`[MetadataExtractor] Video probe failed for ${s3Key}: ${err.message}`);
        return { duration: 0 };
      } finally {
        await fs.unlink(tempVideoPath).catch(() => {});
      }
    }

    return {};
  }
}
