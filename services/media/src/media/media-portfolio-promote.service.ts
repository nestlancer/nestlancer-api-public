import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { StorageService } from '@nestlancer/storage';
import { PromotePortfolioMediaDto } from '../dto/promote-portfolio-media.dto';

@Injectable()
export class MediaPortfolioPromoteService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly storage: StorageService,
  ) {}

  async promote(adminId: string, dto: PromotePortfolioMediaDto) {
    const portfolio = await this.prismaRead.portfolioItem.findFirst({
      where: { id: dto.portfolioItemId, deletedAt: null },
    });
    if (!portfolio) throw new NotFoundException('Portfolio item not found');

    const linked = await this.isMediaOnProject(dto.projectId, dto.sourceMediaId);
    if (!linked) {
      throw new BadRequestException('Media is not attached to this project deliverables');
    }

    const source = await this.prismaRead.media.findFirst({
      where: { id: dto.sourceMediaId, deletedAt: null },
    });
    if (!source) throw new NotFoundException('Source media not found');

    const metadata = (source.metadata ?? {}) as Record<string, unknown>;
    const sourceKey = typeof metadata.storageKey === 'string' ? metadata.storageKey : null;
    const sourceBucket =
      typeof metadata.storageBucket === 'string'
        ? metadata.storageBucket
        : process.env.STORAGE_BUCKET_PRIVATE || 'nestlancer-private';
    const publicBucket = process.env.STORAGE_BUCKET_PUBLIC || 'nestlancer-public';

    let destKey: string | null = null;
    let publicUrl: string | undefined;
    if (sourceKey) {
      const ext = source.filename.includes('.')
        ? source.filename.slice(source.filename.lastIndexOf('.'))
        : '';
      destKey = `portfolio/${dto.portfolioItemId}/${Date.now()}${ext}`;
      const body = await this.storage.download(sourceBucket, sourceKey);
      const uploaded = await this.storage.upload(publicBucket, destKey, body, source.mimeType);
      publicUrl = uploaded.url;
    }

    const copy = await this.prismaWrite.media.create({
      data: {
        uploaderId: adminId,
        filename: source.filename,
        originalFilename: `Portfolio — ${source.originalFilename}`,
        mimeType: source.mimeType,
        size: source.size,
        visibility: 'PUBLIC',
        contextType: 'portfolio',
        contextId: dto.portfolioItemId,
        status: source.status,
        urls: publicUrl ? { original: publicUrl } : (source.urls ?? undefined),
        metadata: {
          storageKey: destKey ?? sourceKey,
          storageBucket: destKey ? publicBucket : sourceBucket,
          promotedFromMediaId: source.id,
          promotedFromProjectId: dto.projectId,
        },
      },
    });

    if (dto.role === 'thumbnail') {
      await this.prismaWrite.portfolioItem.update({
        where: { id: dto.portfolioItemId },
        data: { thumbnailId: copy.id },
      });
    } else {
      const count = await this.prismaWrite.portfolioImage.count({
        where: { portfolioItemId: dto.portfolioItemId },
      });
      await this.prismaWrite.portfolioImage.create({
        data: {
          portfolioItemId: dto.portfolioItemId,
          mediaId: copy.id,
          kind: 'IMAGE',
          alt: dto.alt,
          caption: dto.caption,
          order: count,
        },
      });
    }

    return { mediaId: copy.id, portfolioItemId: dto.portfolioItemId, role: dto.role ?? 'gallery' };
  }

  private async isMediaOnProject(projectId: string, mediaId: string): Promise<boolean> {
    const deliverables = await this.prismaRead.deliverable.findMany({
      where: { milestone: { projectId } },
      select: { attachments: true },
    });
    return deliverables.some(
      (d) => Array.isArray(d.attachments) && d.attachments.map(String).includes(mediaId),
    );
  }
}
