import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MediaStatus } from '@prisma/client';

import { CacheService } from '@nestlancer/cache';
import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { QueuePublisherService } from '@nestlancer/queue';
import { StorageService } from '@nestlancer/storage';

import { MediaJob } from '../interfaces/media-job.interface';
import { ImageResizeProcessor } from '../processors/image-resize.processor';
import { MetadataExtractorProcessor } from '../processors/metadata-extractor.processor';
import { ThumbnailGeneratorProcessor } from '../processors/thumbnail-generator.processor';
import { VirusScanProcessor } from '../processors/virus-scan.processor';
import { resolvePrivateBucket } from '../utils/resolve-private-bucket';

/**
 * Orchestrator service for the Media Worker.
 * Coordinates virus scanning, metadata extraction, thumbnail generation, and image processing.
 * Manages media lifecycle by updating database status throughout the processing pipeline.
 */
@Injectable()
export class MediaWorkerService {
  constructor(
    private readonly virusScan: VirusScanProcessor,
    private readonly imageResize: ImageResizeProcessor,
    private readonly metadataExtractor: MetadataExtractorProcessor,
    private readonly thumbnailGenerator: ThumbnailGeneratorProcessor,
    private readonly prisma: PrismaWriteService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
    private readonly storageService: StorageService,
    private readonly queuePublisher: QueuePublisherService,
  ) {}

  /**
   * Processes a single media job from the queue.
   * Transitions media status from PENDING to PROCESSING, then to READY, FAILED, or QUARANTINED.
   *
   * @param job - The media job payload containing file location and metadata
   * @returns A promise that resolves when all processing steps are complete
   */
  async processJob(job: MediaJob): Promise<void> {
    const lockKey = `media_process_lock:${job.mediaId}`;
    this.logger.log(`[MediaWorker] Starting processing pipeline for Media ID: ${job.mediaId}`);

    // Idempotency: Try to acquire a lock for 10 minutes
    const lockAcquired = await (this.cache.getClient() as any).set(
      lockKey,
      'locked',
      'NX',
      'EX',
      600,
    );
    if (!lockAcquired) {
      this.logger.warn(
        `[MediaWorker] Job for Media ID ${job.mediaId} is already being processed. Skipping.`,
      );
      return;
    }

    let generatedThumbnailKey: string | null = null;
    let generatedVariants: Record<string, string> = {};

    try {
      // 1. Update status to PROCESSING
      await this.prisma.media.update({
        where: { id: job.mediaId },
        data: { status: MediaStatus.PROCESSING },
      });

      // 2. Virus Scan
      const scanResult = await this.virusScan.scanFile(job.s3Key);
      if (scanResult.scanUnavailable) {
        this.logger.error(
          `[MediaWorker] Virus scan unavailable for ${job.s3Key}. Quarantining (fail-closed).`,
        );
        await this.prisma.media.update({
          where: { id: job.mediaId },
          data: {
            status: MediaStatus.QUARANTINED,
            metadata: {
              virus: 'SCAN_UNAVAILABLE',
              scanDetails: scanResult.details,
            },
          },
        });
        return;
      }
      if (scanResult.isInfected) {
        this.logger.warn(
          `[MediaWorker] Security alert: Virus detected in ${job.s3Key}. Quarantining.`,
        );
        const media = await this.prisma.media.findUnique({
          where: { id: job.mediaId },
          select: { uploaderId: true, filename: true },
        });
        await this.prisma.media.update({
          where: { id: job.mediaId },
          data: { status: MediaStatus.QUARANTINED, metadata: { virus: scanResult.virusName } },
        });
        await this.prisma.outbox.create({
          data: {
            type: 'MEDIA_QUARANTINED',
            payload: {
              mediaId: job.mediaId,
              uploaderId: media?.uploaderId,
              filename: media?.filename,
              virusName: scanResult.virusName,
            },
          },
        });
        return;
      }

      // NL-BUG-MEDIA-001: reject SVG content even when declared as PNG/JPEG (MIME spoof).
      try {
        const head = await this.storageService.download(
          resolvePrivateBucket(this.configService),
          job.s3Key,
        );
        const sample = Buffer.isBuffer(head)
          ? head.subarray(0, Math.min(head.length, 4096)).toString('utf8')
          : '';
        if (
          /<\s*svg[\s>]/i.test(sample) ||
          /<\s*\?xml[\s\S]{0,200}<\s*svg[\s>]/i.test(sample)
        ) {
          this.logger.warn(
            `[MediaWorker] SVG payload detected for ${job.mediaId} (declared ${job.contentType}). Quarantining.`,
          );
          await this.prisma.media.update({
            where: { id: job.mediaId },
            data: {
              status: MediaStatus.QUARANTINED,
              metadata: {
                virus: 'SVG_ACTIVE_CONTENT',
                scanDetails: 'SVG markup detected in upload body',
              },
            },
          });
          return;
        }
      } catch (sniffErr: unknown) {
        const message = sniffErr instanceof Error ? sniffErr.message : String(sniffErr);
        this.logger.warn(`[MediaWorker] Content sniff skipped for ${job.mediaId}: ${message}`);
      }

      // 3. Extract Metadata (best-effort)
      let metadata: Record<string, unknown> = {};
      try {
        metadata = await this.metadataExtractor.extract(job.s3Key, job.contentType);
      } catch (metaErr: unknown) {
        const message = metaErr instanceof Error ? metaErr.message : String(metaErr);
        this.logger.warn(
          `[MediaWorker] Metadata extract skipped for ${job.mediaId}: ${message}`,
        );
      }

      const existing = await this.prisma.media.findUnique({
        where: { id: job.mediaId },
        select: { metadata: true },
      });
      const existingMetadata =
        typeof existing?.metadata === 'object' && existing.metadata !== null
          ? (existing.metadata as Record<string, unknown>)
          : {};

      // 4–5. Derivatives are best-effort — corrupt/tiny images must still become READY
      // so message attaches are usable in libraries (NL-MEDIA-001/002).
      try {
        generatedThumbnailKey = await this.thumbnailGenerator.generate(job.s3Key, job.contentType);
      } catch (thumbErr: unknown) {
        const message = thumbErr instanceof Error ? thumbErr.message : String(thumbErr);
        this.logger.warn(
          `[MediaWorker] Thumbnail skipped for ${job.mediaId}: ${message}`,
        );
        generatedThumbnailKey = null;
      }

      if (job.contentType.startsWith('image/')) {
        try {
          generatedVariants = await this.imageResize.process(
            job.s3Key,
            resolvePrivateBucket(this.configService),
          );
        } catch (resizeErr: unknown) {
          const message = resizeErr instanceof Error ? resizeErr.message : String(resizeErr);
          this.logger.warn(
            `[MediaWorker] Image variants skipped for ${job.mediaId}: ${message}`,
          );
          generatedVariants = {};
        }
      }

      // 6. Final Status Update
      const urls: Record<string, string> = {};
      const storageKey =
        typeof existingMetadata.storageKey === 'string' ? existingMetadata.storageKey : job.s3Key;
      if (storageKey) {
        urls.original = storageKey;
      }
      if (generatedThumbnailKey) {
        urls.thumbnail = generatedThumbnailKey;
      }
      if (generatedVariants.medium_800) {
        urls.preview = generatedVariants.medium_800;
      }

      await this.prisma.media.update({
        where: { id: job.mediaId },
        data: {
          status: MediaStatus.READY,
          metadata: {
            ...existingMetadata,
            ...metadata,
            storageKey,
            variants: generatedVariants,
            ...(generatedThumbnailKey
              ? {}
              : { derivativeWarnings: ['thumbnail_or_resize_skipped'] }),
          },
          ...(Object.keys(urls).length > 0 ? { urls } : {}),
        },
      });

      this.logger.log(`[MediaWorker] Processing complete for ID: ${job.mediaId}. Status: READY`);

      try {
        await this.queuePublisher.sendToQueue('cdn.queue', {
          type: 'INVALIDATE_PATH',
          paths: [`/api/v1/media/${job.mediaId}`, `/media/${job.mediaId}`],
        });
      } catch (cdnError: unknown) {
        const message = cdnError instanceof Error ? cdnError.message : String(cdnError);
        this.logger.warn(`CDN invalidation enqueue skipped for ${job.mediaId}: ${message}`);
      }
    } catch (error: any) {
      this.logger.error(
        `[MediaWorker] Pipeline failed for media ${job.mediaId}: ${error.message}`,
        error.stack,
      );

      // Clean up orphaned derivative files
      const privateBucket = resolvePrivateBucket(this.configService);

      if (generatedThumbnailKey) {
        await this.storageService.delete(privateBucket, generatedThumbnailKey).catch((e) => {
          this.logger.error(
            `Failed to cleanup orphaned thumbnail ${generatedThumbnailKey}`,
            e.stack,
          );
        });
      }

      for (const variantKey of Object.values(generatedVariants)) {
        await this.storageService.delete(privateBucket, variantKey).catch((e) => {
          this.logger.error(`Failed to cleanup orphaned variant ${variantKey}`, e.stack);
        });
      }

      await this.prisma.media.update({
        where: { id: job.mediaId },
        data: { status: MediaStatus.FAILED },
      });
      throw error;
    } finally {
      await this.cache.del(lockKey);
    }
  }
}
