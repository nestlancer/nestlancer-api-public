import { registerAs } from '@nestjs/config';

export const mediaWorkerConfig = registerAs('media-worker', () => ({
  concurrency: parseInt(process.env.MEDIA_CONCURRENCY ?? '3', 10),
  tempDir: process.env.MEDIA_TEMP_DIR ?? '/tmp/media-worker',
  /** Private bucket for uploads (used when storage.privateBucket not set). */
  privateBucket: process.env.STORAGE_BUCKET_PRIVATE ?? 'nestlancer-private',
  clamavHost: process.env.MEDIA_WORKER_CLAMAV_HOST ?? process.env.CLAMAV_HOST ?? 'localhost',
  clamavPort: parseInt(
    process.env.MEDIA_WORKER_CLAMAV_PORT ?? process.env.CLAMAV_PORT ?? '3310',
    10,
  ),
  skipVirusScan: process.env.MEDIA_SKIP_VIRUS_SCAN === 'true',
  clamavTimeoutMs: parseInt(process.env.CLAMAV_TIMEOUT_MS ?? '60000', 10),
  webpQuality: parseInt(process.env.WEBP_QUALITY ?? '80', 10),
  maxProcessingTimeMs: parseInt(process.env.MAX_PROCESSING_TIME_MS ?? '300000', 10),
  imageVariants: [
    { name: 'thumb_150', width: 150, height: 150, fit: 'cover' },
    { name: 'medium_800', width: 800, height: 600, fit: 'inside' },
    { name: 'large_1920', width: 1920, height: 1080, fit: 'inside' },
  ],
}));
