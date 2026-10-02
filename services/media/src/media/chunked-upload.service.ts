import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import { ResourceNotFoundException } from '@nestlancer/common';

import { InitChunkUploadDto } from '../dto/chunk-upload.dto';
import { FileType } from '../interfaces/media.interface';
import { MediaStatus } from '../interfaces/media.interface';
import { MediaStorageService } from '../storage/storage.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

import { MediaProcessingService } from './media-processing.service';
import { validateUploadRequest } from './upload-validation.util';

export const DEFAULT_CHUNK_SIZE_BYTES = 10 * 1024 * 1024;

type ChunkMetadata = {
  storageKey: string;
  chunkSize: number;
  totalChunks: number;
  receivedParts: { partNumber: number; etag: string }[];
  s3MultipartUploadId?: string;
};

@Injectable()
export class ChunkedUploadService {
  private readonly logger = new Logger(ChunkedUploadService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly storageService: MediaStorageService,
    private readonly mediaProcessing: MediaProcessingService,
  ) {}

  async init(
    userId: string,
    dto: InitChunkUploadDto & { fileType?: FileType; chunkSize?: number },
  ) {
    const chunkSize = dto.chunkSize ?? DEFAULT_CHUNK_SIZE_BYTES;
    const fileType = dto.fileType ?? FileType.DOCUMENT;
    validateUploadRequest(fileType, dto.mimeType, dto.totalSize);

    const totalChunks = Math.max(1, Math.ceil(dto.totalSize / chunkSize));
    if (totalChunks > 1000) {
      throw new BadRequestException('File requires too many chunks; increase chunk size');
    }

    const storageKey = this.storageService.generateStorageKey(userId, dto.filename);
    const { uploadId: s3MultipartUploadId } = await this.storageService.createMultipartUpload(
      storageKey,
      dto.mimeType,
    );

    const media = await this.prismaWrite.media.create({
      data: {
        uploaderId: userId,
        filename: dto.filename,
        originalFilename: dto.filename,
        mimeType: dto.mimeType,
        size: dto.totalSize,
        status: MediaStatus.UPLOADING,
        contextType: dto.projectId ? 'project' : dto.threadId ? 'thread' : null,
        contextId: dto.projectId ?? dto.threadId ?? null,
        metadata: {
          storageKey,
          chunkSize,
          totalChunks,
          receivedParts: [],
          s3MultipartUploadId,
        } satisfies ChunkMetadata,
      },
    });

    const parts = await Promise.all(
      Array.from({ length: totalChunks }, async (_, index) => {
        const partNumber = index + 1;
        const uploadUrl = await this.storageService.getSignedPartUploadUrl(
          storageKey,
          s3MultipartUploadId,
          partNumber,
        );
        return { partNumber, uploadUrl };
      }),
    );

    return {
      uploadId: media.id,
      mediaId: media.id,
      chunkSize,
      totalChunks,
      parts,
    };
  }

  async recordPart(
    userId: string,
    uploadId: string,
    partNumber: number,
    etag: string,
  ): Promise<{ uploadId: string; partNumber: number; received: boolean }> {
    const media = await this.getOwnedSession(uploadId, userId);
    const metadata = (media.metadata || {}) as ChunkMetadata;
    const receivedParts = metadata.receivedParts ?? [];
    const normalizedEtag = etag.replace(/"/g, '');
    const existing = receivedParts.filter((p) => p.partNumber !== partNumber);
    existing.push({ partNumber, etag: normalizedEtag });

    await this.prismaWrite.media.update({
      where: { id: uploadId },
      data: {
        metadata: {
          ...metadata,
          receivedParts: existing,
        },
      },
    });

    return { uploadId, partNumber, received: true };
  }

  async complete(userId: string, uploadId: string, parts?: { partNumber: number; etag: string }[]) {
    const media = await this.getOwnedSession(uploadId, userId);
    const metadata = (media.metadata || {}) as ChunkMetadata;
    const storageKey = metadata.storageKey;
    const s3UploadId = metadata.s3MultipartUploadId;

    if (!storageKey || !s3UploadId) {
      throw new BadRequestException('Invalid chunked upload session');
    }

    const finalParts = (parts?.length ? parts : metadata.receivedParts) ?? [];
    if (finalParts.length < (metadata.totalChunks ?? 1)) {
      throw new BadRequestException('Not all parts have been uploaded');
    }

    await this.storageService.completeMultipartUpload(storageKey, s3UploadId, finalParts);

    const updated = await this.prismaWrite.media.update({
      where: { id: uploadId },
      data: {
        status: MediaStatus.PROCESSING,
        metadata: {
          ...metadata,
          receivedParts: finalParts,
        },
      },
    });

    await this.mediaProcessing.enqueue(updated);
    return { uploadId, mediaId: media.id, assembled: true, status: updated.status };
  }

  async getStatus(userId: string, uploadId: string) {
    const media = await this.getOwnedSession(uploadId, userId);
    const metadata = (media.metadata || {}) as ChunkMetadata;
    const totalChunks = metadata.totalChunks ?? 1;
    const received = metadata.receivedParts ?? [];
    const receivedNumbers = new Set(received.map((p) => p.partNumber));
    const missingChunks: number[] = [];
    for (let i = 1; i <= totalChunks; i++) {
      if (!receivedNumbers.has(i)) missingChunks.push(i);
    }
    const progress = totalChunks > 0 ? (received.length / totalChunks) * 100 : 100;

    return {
      uploadId,
      status: media.status,
      completedChunks: received.map((p) => p.partNumber),
      missingChunks,
      progress: `${progress.toFixed(2)}%`,
    };
  }

  async abort(userId: string, uploadId: string) {
    const media = await this.getOwnedSession(uploadId, userId);
    const metadata = (media.metadata || {}) as ChunkMetadata;
    if (metadata.storageKey && metadata.s3MultipartUploadId) {
      try {
        await this.storageService.abortMultipartUpload(
          metadata.storageKey,
          metadata.s3MultipartUploadId,
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Abort multipart failed for ${uploadId}: ${message}`);
      }
    }
    await this.prismaWrite.media.delete({ where: { id: uploadId } });
    return { uploadId, aborted: true };
  }

  private async getOwnedSession(uploadId: string, userId: string) {
    const media = await this.prismaRead.media.findFirst({
      where: { id: uploadId, uploaderId: userId },
    });
    if (!media) throw new ResourceNotFoundException('Upload session', uploadId);
    return media;
  }
}
