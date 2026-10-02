import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { MediaStatus } from '@prisma/client';

import { PrismaWriteService } from '@nestlancer/database';

/** Mark media stuck in transient states so UI can surface FAILED instead of spinning forever. */
@Injectable()
export class MediaStaleProcessingCron {
  private readonly logger = new Logger(MediaStaleProcessingCron.name);

  private static readonly PROCESSING_STALE_MS = 30 * 60 * 1000;
  private static readonly UPLOADING_STALE_MS = 2 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaWriteService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async markStaleMediaFailed(): Promise<void> {
    const now = Date.now();
    const processingCutoff = new Date(now - MediaStaleProcessingCron.PROCESSING_STALE_MS);
    const uploadingCutoff = new Date(now - MediaStaleProcessingCron.UPLOADING_STALE_MS);

    let processingCount = 0;
    let uploadingCount = 0;

    const staleProcessing = await this.prisma.media.findMany({
      where: {
        status: { in: [MediaStatus.PROCESSING, MediaStatus.PENDING] },
        updatedAt: { lt: processingCutoff },
        deletedAt: null,
      },
      select: { id: true, metadata: true },
    });

    for (const row of staleProcessing) {
      await this.prisma.media.update({
        where: { id: row.id },
        data: {
          status: MediaStatus.FAILED,
          metadata: {
            ...((row.metadata as Record<string, unknown> | null) ?? {}),
            failureReason: 'processing_timeout',
            failedAt: new Date().toISOString(),
          },
        },
      });
      processingCount++;
    }

    const staleUploading = await this.prisma.media.findMany({
      where: {
        status: MediaStatus.UPLOADING,
        updatedAt: { lt: uploadingCutoff },
        deletedAt: null,
      },
      select: { id: true, metadata: true },
    });

    for (const row of staleUploading) {
      await this.prisma.media.update({
        where: { id: row.id },
        data: {
          status: MediaStatus.FAILED,
          metadata: {
            ...((row.metadata as Record<string, unknown> | null) ?? {}),
            failureReason: 'upload_timeout',
            failedAt: new Date().toISOString(),
          },
        },
      });
      uploadingCount++;
    }

    if (processingCount + uploadingCount > 0) {
      this.logger.warn(
        `Marked ${processingCount} PROCESSING/PENDING and ${uploadingCount} UPLOADING media records as FAILED (stale)`,
      );
    }
  }
}
