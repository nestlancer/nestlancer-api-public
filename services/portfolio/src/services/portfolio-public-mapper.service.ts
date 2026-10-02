import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';
import { StorageService } from '@nestlancer/storage';
import { resolvePortfolioMediaUrl } from '../utils/portfolio-storage.util';

type PortfolioRecord = Record<string, unknown> & {
  id: string;
  thumbnailId?: string | null;
  videoId?: string | null;
  sourceProjectId?: string | null;
  images?: Array<{
    mediaId: string;
    kind?: string;
    title?: string | null;
    alt?: string | null;
    caption?: string | null;
    order: number;
  }>;
  clientName?: string | null;
  clientIndustry?: string | null;
  clientWebsite?: string | null;
  clientTestimonial?: unknown;
  projectDetails?: unknown;
  links?: unknown;
  stats?: unknown;
};

@Injectable()
export class PortfolioPublicMapperService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly storage: StorageService,
  ) {}

  async toPublicItem(item: PortfolioRecord) {
    const [mapped] = await this.toPublicItems([item]);
    return mapped;
  }

  /** Batch-map a page of portfolio items with one media query (scales vs N per-item queries). */
  async toPublicItems(items: PortfolioRecord[]) {
    if (items.length === 0) return [];

    const allMediaIds = new Set<string>();
    for (const item of items) {
      for (const img of item.images ?? []) {
        if (img.mediaId) allMediaIds.add(img.mediaId);
      }
      if (item.thumbnailId) allMediaIds.add(item.thumbnailId);
      if (item.videoId) allMediaIds.add(item.videoId);
    }

    const allMediaRows = allMediaIds.size
      ? await this.prismaRead.media.findMany({
          where: { id: { in: [...allMediaIds] }, deletedAt: null },
        })
      : [];
    const mediaById = new Map(allMediaRows.map((m) => [m.id, m]));

    return Promise.all(items.map((item) => this.mapOne(item, mediaById)));
  }

  private async mapOne(
    item: PortfolioRecord,
    mediaById: Map<string, { id: string; visibility?: string; mimeType?: string | null; originalFilename?: string | null; filename?: string; metadata?: unknown; urls?: unknown }>,
  ) {
    const {
      sourceProjectId: _source,
      visibility: _visibility,
      deletedAt: _deletedAt,
      categoryId: _categoryId,
      thumbnailId: _thumbnailId,
      videoId: _videoId,
      clientName: _clientName,
      clientIndustry: _clientIndustry,
      clientWebsite: _clientWebsite,
      clientTestimonial: _clientTestimonial,
      clientLogo: _clientLogo,
      images: rawImages,
      ...safe
    } = item;

    const seenMedia = new Set<string>();
    const uniqueAssets = (rawImages ?? []).filter((img) => {
      if (seenMedia.has(img.mediaId)) return false;
      seenMedia.add(img.mediaId);
      return true;
    });

    const [thumbnailUrl, featuredVideoUrl] = await Promise.all([
      item.thumbnailId
        ? resolvePortfolioMediaUrl(this.storage, mediaById.get(item.thumbnailId) ?? {})
        : Promise.resolve(undefined),
      item.videoId
        ? resolvePortfolioMediaUrl(this.storage, mediaById.get(item.videoId) ?? {})
        : Promise.resolve(undefined),
    ]);

    const previewMedia = await Promise.all(
      uniqueAssets.map(async (asset) => {
        const media = mediaById.get(asset.mediaId);
        if (!media || media.visibility !== 'PUBLIC') {
          return null;
        }
        const url = await resolvePortfolioMediaUrl(this.storage, media);
        const kind = String(asset.kind ?? this.inferKind(media?.mimeType)).toUpperCase();
        return {
          mediaId: asset.mediaId,
          kind,
          title: asset.title ?? media?.originalFilename ?? media?.filename,
          mimeType: media?.mimeType,
          url,
          alt: asset.alt,
          caption: asset.caption,
          order: asset.order,
        };
      }),
    );

    const validMedia = previewMedia.filter((m): m is NonNullable<typeof m> => m !== null);
    const gallery = validMedia.filter((m) => m.kind === 'IMAGE' && m.url);
    const documents = validMedia.filter((m) => m.kind === 'DOCUMENT' && m.url);
    const videos = validMedia.filter((m) => m.kind === 'VIDEO' && m.url);

    return {
      ...safe,
      thumbnailUrl,
      featuredVideoUrl,
      imageIds: gallery.map((i) => i.mediaId),
      gallery,
      previewMedia: validMedia,
      documents,
      videos,
      client: item.clientName
        ? {
            name: item.clientName,
            industry: item.clientIndustry,
            website: item.clientWebsite,
            testimonial: item.clientTestimonial,
          }
        : undefined,
      ctaReferenceId: item.id,
    };
  }

  private inferKind(mimeType?: string | null): string {
    const mime = (mimeType ?? '').toLowerCase();
    if (mime.startsWith('image/')) return 'IMAGE';
    if (mime.startsWith('video/')) return 'VIDEO';
    return 'DOCUMENT';
  }
}
