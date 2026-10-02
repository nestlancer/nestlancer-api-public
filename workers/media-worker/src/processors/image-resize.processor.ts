import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { StorageService } from '@nestlancer/storage';

import { ImageVariant } from '../interfaces/processing-options.interface';
import { ImageProcessingService } from '../services/image-processing.service';

/**
 * Processor responsible for generating multiple scaled variants of an image.
 * Uses sharp via ImageProcessingService to resize and optimize images for different use cases.
 */
@Injectable()
export class ImageResizeProcessor {
  constructor(
    private readonly imageService: ImageProcessingService,
    private readonly storage: StorageService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Resizes an image based on predefined variants in the config.
   * Uploads each variant back to the storage bucket.
   *
   * @param s3Key - The original file key
   * @param bucket - The storage bucket containing the file
   * @returns A promise resolving to a map of variant names to their new S3 keys
   */
  async process(s3Key: string, bucket: string): Promise<Record<string, string>> {
    const variants = this.configService.get<ImageVariant[]>('media-worker.imageVariants', []);
    const originalBuffer = await this.storage.download(bucket, s3Key);
    const variantKeys: Record<string, string> = {};

    for (const variant of variants) {
      const resizedBuffer = await this.imageService.resize(originalBuffer, variant);
      const variantKey = `${variant.name}_${s3Key}`;

      // Upload as WebP for optimal size/quality
      await this.storage.upload(bucket, variantKey, resizedBuffer, 'image/webp');
      variantKeys[variant.name] = variantKey;
    }

    return variantKeys;
  }
}
