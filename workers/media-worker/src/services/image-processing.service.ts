import { Injectable } from '@nestjs/common';

import sharp from 'sharp';

import { ImageVariant, MediaMetadata } from '../interfaces/processing-options.interface';

@Injectable()
export class ImageProcessingService {
  async resize(input: Buffer, variant: ImageVariant): Promise<Buffer> {
    // Variants are uploaded as image/webp. Keep the bytes in that format.
    return sharp(input)
      .resize(variant.width, variant.height, { fit: variant.fit })
      .webp({ quality: 80 })
      .toBuffer();
  }

  async compress(input: Buffer, quality = 80): Promise<Buffer> {
    return sharp(input).webp({ quality }).toBuffer();
  }

  async extractMetadata(input: Buffer): Promise<MediaMetadata> {
    const metadata = await sharp(input).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      colorSpace: metadata.space,
      exif: metadata.exif ? 'present' : undefined,
    };
  }

  async generateThumbnail(input: Buffer): Promise<Buffer> {
    return sharp(input).resize(300, 200, { fit: 'cover' }).webp({ quality: 70 }).toBuffer();
  }
}
