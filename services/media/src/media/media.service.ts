import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService, ReadOnly } from '@nestlancer/database';
import { MediaStorageService } from '../storage/storage.service';
import { RequestUploadDto } from '../dto/request-upload.dto';
import { ConfirmUploadDto } from '../dto/confirm-upload.dto';
import { DirectUploadDto } from '../dto/direct-upload.dto';
import { UpdateMediaMetadataDto } from '../dto/update-media-metadata.dto';
import { QueryMediaDto } from '../dto/query-media.dto';
import { MediaStatus } from '../interfaces/media.interface';
import { validateUploadRequest, normalizeUploadMime, normalizeDirectUploadDto } from './upload-validation.util';
import { MediaJobType, MediaJobContext } from '../interfaces/media-processing.interface';
import { MediaProcessingService } from './media-processing.service';
import { MediaAccessService } from './media-access.service';
import { MediaLibraryScopeService } from './media-library-scope.service';
import { enrichMediaList, enrichMediaUrls } from './media-urls.util';
import { MediaConfig } from '../config/media.config';
import { buildMediaWhereClause } from './media-admin-query.util';
import {
  buildPrismaSkipTake,
  createPaginationMeta,
  ResourceNotFoundException,
} from '@nestlancer/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly storageService: MediaStorageService,
    private readonly mediaProcessing: MediaProcessingService,
    private readonly mediaAccess: MediaAccessService,
    private readonly libraryScope: MediaLibraryScopeService,
  ) {}

  @ReadOnly()
  async findByUser(userId: string, query: QueryMediaDto) {
    const { skip, take } = buildPrismaSkipTake(query.page, query.limit);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;

    // Default: unified library (owned + accessible). scope=owned keeps personal-only lists.
    const where =
      query.scope === 'owned'
        ? buildMediaWhereClause({
            uploaderId: userId,
            fileType: query.fileType,
            status: query.status,
            search: query.search,
            contextType: query.contextType,
            contextId: query.contextId,
          })
        : await this.libraryScope.buildLibraryWhere(userId, {
            fileType: query.fileType,
            status: query.status,
            search: query.search,
            source: (query.contextType as any) || 'all',
            contextId: query.contextId,
          });

    const sortField = query.sort || 'createdAt';
    const sortOrder = ((query as { order?: string }).order || 'desc') as 'asc' | 'desc';

    const [items, total] = await Promise.all([
      this.prismaRead.media.findMany({
        where,
        skip,
        take,
        orderBy: { [sortField]: sortOrder },
      }),
      this.prismaRead.media.count({ where }),
    ]);

    // Scale: only sign S3 URLs when the client asks (includeUrls=true).
    // Default list returns metadata — signing 3 URLs/row hairpins MinIO under load.
    const includeUrls = query.includeUrls === true;
    const enriched = includeUrls
      ? await enrichMediaList(items as Record<string, unknown>[], this.storageService)
      : (items as Record<string, unknown>[]);

    return {
      data: enriched.map((item) => ({
        ...item,
        canDelete: (item as { uploaderId?: string }).uploaderId === userId,
      })),
      pagination: createPaginationMeta(total, page, limit),
    };
  }

  @ReadOnly()
  async findById(mediaId: string, userId: string) {
    return this.findAccessibleMedia(mediaId, userId);
  }

  private resolveMediaContext(projectId?: string, threadId?: string, messageId?: string) {
    if (messageId) {
      return { contextType: 'message', contextId: messageId };
    }
    if (threadId) {
      return { contextType: 'thread', contextId: threadId };
    }
    if (projectId) {
      return { contextType: 'project', contextId: projectId };
    }
    return { contextType: null, contextId: null };
  }

  private jobContextFromMedia(media: { contextType?: string | null }) {
    if (media.contextType === 'message') return MediaJobContext.MESSAGE;
    if (media.contextType === 'thread') return MediaJobContext.MESSAGE;
    if (media.contextType === 'project') return MediaJobContext.PROJECT;
    return undefined;
  }

  private async findAccessibleMedia(mediaId: string, userId: string) {
    const media = await this.prismaWrite.media.findFirst({ where: { id: mediaId } });
    if (!media) {
      throw new ResourceNotFoundException('Media');
    }
    await this.mediaAccess.assertCanAccessMedia(userId, media);
    return enrichMediaUrls(media as Record<string, unknown>, this.storageService);
  }

  async requestUpload(userId: string, dto: RequestUploadDto) {
    validateUploadRequest(dto.fileType, dto.mimeType, dto.size, dto.filename);
    const key = this.storageService.generateStorageKey(userId, dto.filename);
    const context = this.resolveMediaContext(dto.projectId, dto.threadId, dto.messageId);

    const media = await this.prismaWrite.media.create({
      data: {
        uploaderId: userId,
        filename: dto.filename,
        originalFilename: dto.filename,
        mimeType: dto.mimeType,
        size: dto.size,
        status: MediaStatus.PENDING,
        contextType: context.contextType,
        contextId: context.contextId,
        metadata: {
          storageKey: key,
        },
      },
    });

    const uploadUrl = await this.storageService.generatePresignedUploadUrl(key, dto.mimeType);

    return {
      mediaId: media.id,
      uploadUrl,
      key,
      expiresIn: MediaConfig.PRESIGNED_URL_EXPIRY,
    };
  }

  async confirmUpload(userId: string, dto: { uploadId: string; providerMetadata?: any }) {
    const media = await this.prismaWrite.media.findFirst({
      where: { id: dto.uploadId, uploaderId: userId },
    });

    if (!media) {
      throw new ResourceNotFoundException('Media');
    }

    const updated = await this.prismaWrite.media.update({
      where: { id: dto.uploadId },
      data: {
        status: MediaStatus.PROCESSING,
        metadata: {
          ...(media.metadata as any),
          providerMetadata: dto.providerMetadata,
        },
      },
    });

    await this.mediaProcessing
      .enqueue(updated, {
        context: this.jobContextFromMedia(updated),
      })
      .catch(async (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Processing queue unavailable for ${updated.id}: ${message}`);
        await this.prismaWrite.media.update({
          where: { id: updated.id },
          data: {
            status: MediaStatus.FAILED,
            metadata: {
              ...(updated.metadata as Record<string, unknown>),
              failureReason: 'queue_unavailable',
              failedAt: new Date().toISOString(),
            },
          },
        });
        throw error;
      });
    return updated;
  }

  async directUpload(userId: string, file: any, dto: DirectUploadDto) {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Multipart field "file" is required. POST /api/v1/media/upload/direct with form field file and optional fileType (DOCUMENT, IMAGE, …).',
      );
    }

    const normalizedDto = normalizeDirectUploadDto(dto, file.mimetype ?? 'application/octet-stream');
    const mimeType = normalizeUploadMime(
      file.mimetype ?? 'application/octet-stream',
      file.originalname ?? '',
      normalizedDto.fileType,
    );
    validateUploadRequest(normalizedDto.fileType, mimeType, file.size, file.originalname);
    const key = this.storageService.generateStorageKey(userId, file.originalname);
    const context = this.resolveMediaContext(
      normalizedDto.projectId,
      normalizedDto.threadId,
      normalizedDto.messageId,
    );

    const media = await this.prismaWrite.media.create({
      data: {
        uploaderId: userId,
        filename: file.originalname,
        originalFilename: file.originalname,
        mimeType,
        size: file.size,
        status: MediaStatus.UPLOADING,
        contextType: context.contextType,
        contextId: context.contextId,
        metadata: {
          storageKey: key,
        },
      },
    });

    await this.storageService.upload(
      this.storageService.privateBucket,
      key,
      file.buffer,
      mimeType,
    );

    const processing = await this.prismaWrite.media.update({
      where: { id: media.id },
      data: { status: MediaStatus.PROCESSING },
    });
    try {
      await this.mediaProcessing.enqueue(processing, {
        context: this.jobContextFromMedia(processing),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Processing queue unavailable for ${processing.id}: ${message}`);
      return this.prismaWrite.media.update({
        where: { id: processing.id },
        data: {
          status: MediaStatus.FAILED,
          metadata: {
            ...(processing.metadata as Record<string, unknown>),
            failureReason: 'queue_unavailable',
            queueEnqueueFailed: true,
            queueEnqueueError: message,
            queueEnqueueFailedAt: new Date().toISOString(),
          },
        },
      });
    }
    return processing;
  }

  async enqueueReprocess(mediaId: string, type: MediaJobType = MediaJobType.IMAGE_PROCESS) {
    const media = await this.prismaWrite.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new ResourceNotFoundException('Media');
    await this.prismaWrite.media.update({
      where: { id: mediaId },
      data: { status: MediaStatus.PROCESSING },
    });
    await this.mediaProcessing.enqueue(media, { type });
    return media;
  }

  async delete(mediaId: string, userId: string) {
    const media = await this.prismaWrite.media.findFirst({
      where: { id: mediaId, uploaderId: userId },
    });

    if (!media) {
      throw new ResourceNotFoundException('Media');
    }

    const metadata = media.metadata as any;
    const storageKey = metadata?.storageKey;

    if (storageKey) {
      await this.storageService.deleteFile(storageKey);
    }

    return this.prismaWrite.media.delete({
      where: { id: mediaId },
    });
  }

  async getDownloadUrl(mediaId: string, userId: string) {
    const media = await this.findAccessibleMedia(mediaId, userId);

    const metadata = media.metadata as any;
    const storageKey = metadata?.storageKey;

    if (!storageKey) {
      throw new ResourceNotFoundException('Storage file');
    }

    const rawName = media.filename ?? media.originalFilename;
    const downloadName =
      typeof rawName === 'string' && rawName.trim() ? rawName.trim() : undefined;
    const downloadUrl = await this.storageService.generatePresignedDownloadUrl(
      storageKey,
      downloadName,
    );


    return {
      downloadUrl,
      expiresIn: MediaConfig.PRESIGNED_URL_EXPIRY,
    };
  }

  async updateMetadata(mediaId: string, userId: string, dto: UpdateMediaMetadataDto) {
    const media = await this.prismaWrite.media.findFirst({
      where: { id: mediaId, uploaderId: userId },
    });

    if (!media) {
      throw new ResourceNotFoundException('Media');
    }

    return this.prismaWrite.media.update({
      where: { id: mediaId },
      data: {
        filename: dto.filename,
        metadata: {
          ...(media.metadata as any),
          customMetadata: dto.customMetadata,
          description: dto.description,
        } as any,
      },
    });
  }

  @ReadOnly()
  async getStorageStats(userId: string) {
    // Match the library the client sees (owned + accessible), not uploads they personally made.
    const where = await this.libraryScope.buildLibraryWhere(userId, { status: 'READY' });
    const result = await this.prismaRead.media.aggregate({
      where,
      _sum: { size: true },
    });

    return {
      totalUsedBytes: result._sum.size || 0,
      quotaBytes: 5 * 1024 * 1024 * 1024, // 5GB default quota
    };
  }

  async copyMedia(userId: string, mediaId: string, destinationFolderId?: string) {
    const media = await this.prismaWrite.media.findFirst({
      where: { id: mediaId, uploaderId: userId },
    });
    if (!media) throw new ResourceNotFoundException('Media');

    const metadata = media.metadata as { storageKey?: string } | null;
    const sourceKey = metadata?.storageKey;
    const destKey = sourceKey
      ? this.storageService.generateStorageKey(userId, `copy-${media.filename}`)
      : null;

    if (sourceKey && destKey) {
      await this.storageService.copyFile(sourceKey, destKey);
    }

    return this.prismaWrite.media.create({
      data: {
        uploaderId: userId,
        filename: `Copy of ${media.filename}`,
        originalFilename: `Copy of ${media.originalFilename}`,
        mimeType: media.mimeType,
        size: media.size,
        urls: media.urls ?? undefined,
        contextType: destinationFolderId ? 'folder' : media.contextType,
        contextId: destinationFolderId || media.contextId,
        status: media.status,
        metadata: {
          ...(metadata || {}),
          storageKey: destKey ?? sourceKey,
        },
      },
    });
  }

  async moveMedia(userId: string, mediaId: string, destinationFolderId: string) {
    if (!destinationFolderId?.trim()) {
      throw new BadRequestException('destinationFolderId is required');
    }
    const media = await this.prismaWrite.media.findFirst({
      where: { id: mediaId, uploaderId: userId },
    });
    if (!media) throw new ResourceNotFoundException('Media');

    return this.prismaWrite.media.update({
      where: { id: mediaId },
      data: {
        contextType: 'folder',
        contextId: destinationFolderId,
      },
    });
  }

  @ReadOnly()
  async getProcessingStatus(mediaId: string, userId: string) {
    const media = await this.findAccessibleMedia(mediaId, userId);
    return { id: media.id, status: media.status };
  }
}
