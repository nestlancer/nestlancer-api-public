import { Injectable, Logger } from '@nestjs/common';

import { QueuePublisherService } from '@nestlancer/queue';

import {
  MediaJobContext,
  MediaJobType,
  MEDIA_PROCESSING_QUEUE,
} from '../interfaces/media-processing.interface';

type MediaRecord = {
  id: string;
  mimeType: string;
  uploaderId: string;
  metadata?: unknown;
};

@Injectable()
export class MediaProcessingService {
  private readonly logger = new Logger(MediaProcessingService.name);

  constructor(private readonly queuePublisher: QueuePublisherService) {}

  resolveJobType(mimeType: string): MediaJobType {
    if (mimeType.startsWith('image/')) return MediaJobType.IMAGE_PROCESS;
    if (mimeType.startsWith('video/')) return MediaJobType.VIDEO_PROCESS;
    return MediaJobType.DOCUMENT_PROCESS;
  }

  resolveContext(projectId?: string, messageId?: string): MediaJobContext {
    if (messageId) return MediaJobContext.MESSAGE;
    if (projectId) return MediaJobContext.PROJECT;
    return MediaJobContext.PROJECT;
  }

  async enqueue(
    media: MediaRecord,
    options?: {
      type?: MediaJobType;
      context?: MediaJobContext;
    },
  ): Promise<void> {
    const metadata = media.metadata as { storageKey?: string } | null;
    const s3Key = metadata?.storageKey;
    if (!s3Key) {
      this.logger.warn(`Skip media queue: no storageKey for media ${media.id}`);
      return;
    }

    const payload = {
      type: options?.type ?? this.resolveJobType(media.mimeType),
      mediaId: media.id,
      s3Key,
      contentType: media.mimeType,
      context: options?.context ?? MediaJobContext.PROJECT,
      userId: media.uploaderId,
    };

    try {
      await this.queuePublisher.sendToQueue(MEDIA_PROCESSING_QUEUE, payload);
      this.logger.debug(`Enqueued media job ${payload.type} for ${media.id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to enqueue media job for ${media.id}: ${message}`);
      throw error;
    }
  }
}
