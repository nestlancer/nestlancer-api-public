import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { StorageService } from '@nestlancer/storage';
import {
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
} from '@nestlancer/common';
import { PortfolioMediaKind, Prisma } from '@prisma/client';
import { portfolioPublicBucket, resolvePortfolioMediaUrl } from '../utils/portfolio-storage.util';

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const IMAGE_MIMES = new Set<string>(ALLOWED_IMAGE_TYPES);
const VIDEO_MIMES = new Set<string>(ALLOWED_VIDEO_TYPES);
const DOCUMENT_MIMES = new Set<string>(ALLOWED_DOCUMENT_TYPES);

@Injectable()
export class PortfolioMediaService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly storage: StorageService,
  ) {}

  inferKind(mimeType: string): PortfolioMediaKind {
    const mime = mimeType.trim().toLowerCase();
    if (IMAGE_MIMES.has(mime) || mime.startsWith('image/')) return PortfolioMediaKind.IMAGE;
    if (VIDEO_MIMES.has(mime) || mime.startsWith('video/')) return PortfolioMediaKind.VIDEO;
    return PortfolioMediaKind.DOCUMENT;
  }

  private validateMime(kind: PortfolioMediaKind, mimeType: string) {
    const mime = mimeType.trim().toLowerCase();
    const allowed =
      kind === PortfolioMediaKind.IMAGE
        ? IMAGE_MIMES
        : kind === PortfolioMediaKind.VIDEO
          ? VIDEO_MIMES
          : DOCUMENT_MIMES;
    if (!allowed.has(mime)) {
      throw new BadRequestException(`MIME type ${mimeType} is not allowed for ${kind} previews`);
    }
  }

  async listForAdmin(portfolioItemId: string) {
    await this.assertPortfolioItem(portfolioItemId);
    const rows = await this.prismaRead.portfolioImage.findMany({
      where: { portfolioItemId },
      orderBy: { order: 'asc' },
    });

    const item = await this.prismaRead.portfolioItem.findUnique({
      where: { id: portfolioItemId },
      select: { thumbnailId: true, videoId: true },
    });

    return Promise.all(
      rows.map(async (row) => {
        const media = await this.prismaRead.media.findFirst({
          where: { id: row.mediaId, deletedAt: null },
        });
        const url = media ? await this.resolveMediaUrl(media) : undefined;
        return {
          ...row,
          filename: media?.originalFilename ?? media?.filename,
          mimeType: media?.mimeType,
          size: media?.size,
          url,
          isThumbnail: item?.thumbnailId === row.mediaId,
          isFeaturedVideo: item?.videoId === row.mediaId,
        };
      }),
    );
  }

  async uploadPreviewFile(
    adminId: string,
    portfolioItemId: string,
    file: UploadedFile,
    options?: { title?: string; setAsThumbnail?: boolean; setAsFeaturedVideo?: boolean },
  ) {
    const item = await this.assertPortfolioItem(portfolioItemId);
    const kind = this.inferKind(file.mimetype);
    this.validateMime(kind, file.mimetype);

    const ext = file.originalname.includes('.')
      ? file.originalname.slice(file.originalname.lastIndexOf('.'))
      : '';
    const storageKey = `portfolio/${portfolioItemId}/${Date.now()}${ext}`;
    const bucket = portfolioPublicBucket();

    const uploadResult = await this.storage.upload(bucket, storageKey, file.buffer, file.mimetype);

    const media = await this.prismaWrite.media.create({
      data: {
        uploaderId: adminId,
        filename: file.originalname,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        visibility: 'PUBLIC',
        contextType: 'portfolio',
        contextId: portfolioItemId,
        status: 'READY',
        urls: uploadResult.url ? { original: uploadResult.url } : undefined,
        metadata: {
          storageKey,
          storageBucket: bucket,
        },
      },
    });

    const count = await this.prismaWrite.portfolioImage.count({
      where: { portfolioItemId },
    });

    const attachment = await this.prismaWrite.portfolioImage.create({
      data: {
        portfolioItemId,
        mediaId: media.id,
        kind,
        title: options?.title?.trim() || file.originalname,
        order: count,
      },
    });

    const itemPatch: Prisma.PortfolioItemUncheckedUpdateInput = {};
    if (kind === PortfolioMediaKind.IMAGE && (options?.setAsThumbnail || !item.thumbnailId)) {
      itemPatch.thumbnailId = media.id;
    }
    if (kind === PortfolioMediaKind.VIDEO && (options?.setAsFeaturedVideo || !item.videoId)) {
      itemPatch.videoId = media.id;
    }
    if (Object.keys(itemPatch).length > 0) {
      await this.prismaWrite.portfolioItem.update({
        where: { id: portfolioItemId },
        data: itemPatch,
      });
    }

    const url = await this.resolveMediaUrl(media);
    return {
      attachment,
      media: { id: media.id, mimeType: media.mimeType, filename: media.originalFilename },
      url,
      kind,
    };
  }

  async setThumbnail(portfolioItemId: string, mediaId: string) {
    await this.assertPortfolioItem(portfolioItemId);
    await this.assertAttachment(portfolioItemId, mediaId, PortfolioMediaKind.IMAGE);
    await this.prismaWrite.portfolioItem.update({
      where: { id: portfolioItemId },
      data: { thumbnailId: mediaId },
    });
    return { portfolioItemId, thumbnailId: mediaId };
  }

  async setFeaturedVideo(portfolioItemId: string, mediaId: string) {
    await this.assertPortfolioItem(portfolioItemId);
    await this.assertAttachment(portfolioItemId, mediaId, PortfolioMediaKind.VIDEO);
    await this.prismaWrite.portfolioItem.update({
      where: { id: portfolioItemId },
      data: { videoId: mediaId },
    });
    return { portfolioItemId, videoId: mediaId };
  }

  async removeAttachment(portfolioItemId: string, mediaRef: string) {
    const item = await this.assertPortfolioItem(portfolioItemId);
    const row = await this.prismaRead.portfolioImage.findFirst({
      where: {
        portfolioItemId,
        OR: [{ id: mediaRef }, { mediaId: mediaRef }],
      },
    });
    if (!row) throw new NotFoundException('Portfolio media not found');

    await this.prismaWrite.portfolioImage.delete({ where: { id: row.id } });

    const patch: Prisma.PortfolioItemUpdateInput = {};
    if (item.thumbnailId === row.mediaId) patch.thumbnail = { disconnect: true };
    if (item.videoId === row.mediaId) patch.video = { disconnect: true };
    if (Object.keys(patch).length > 0) {
      await this.prismaWrite.portfolioItem.update({
        where: { id: portfolioItemId },
        data: patch,
      });
    }

    return { portfolioItemId, removedMediaId: row.mediaId };
  }

  private async assertPortfolioItem(portfolioItemId: string) {
    // Primary, not the read replica: uploads often follow create in the same request
    // and a replica lag 404s a row that was just written.
    const item = await this.prismaWrite.portfolioItem.findFirst({
      where: { id: portfolioItemId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Portfolio item not found');
    return item;
  }

  private async assertAttachment(
    portfolioItemId: string,
    mediaId: string,
    kind?: PortfolioMediaKind,
  ) {
    const row = await this.prismaRead.portfolioImage.findFirst({
      where: { portfolioItemId, mediaId, ...(kind ? { kind } : {}) },
    });
    if (!row) throw new NotFoundException('Portfolio media attachment not found');
    return row;
  }

  private async resolveMediaUrl(media: {
    metadata?: unknown;
    urls?: unknown;
    visibility?: string | null;
  }): Promise<string | undefined> {
    return resolvePortfolioMediaUrl(this.storage, media);
  }
}
