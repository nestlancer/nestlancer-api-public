import { Injectable } from '@nestjs/common';
import { PrismaReadService, ReadOnly } from '@nestlancer/database';

export type PublicMediaScope = {
  ids: string[];
  blogIds: string[];
  portfolioIds: string[];
  explicitIds: string[];
};

const CACHE_TTL_MS = 60_000;

@Injectable()
export class MediaAdminPublicScopeService {
  private cache: { scope: PublicMediaScope; expires: number } | null = null;

  constructor(private readonly prismaRead: PrismaReadService) {}

  @ReadOnly()
  async resolvePublicScope(): Promise<PublicMediaScope> {
    if (this.cache && Date.now() < this.cache.expires) {
      return this.cache.scope;
    }

    const [explicitRows, blogPosts, portfolioImages, portfolioHeroes] = await Promise.all([
      this.prismaRead.media.findMany({
        where: { visibility: 'PUBLIC' },
        select: { id: true },
      }),
      this.prismaRead.blogPost.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          featuredImageId: { not: null },
        },
        select: { featuredImageId: true },
      }),
      this.prismaRead.portfolioImage.findMany({
        where: {
          portfolioItem: {
            status: 'PUBLISHED',
            deletedAt: null,
            visibility: { in: ['PUBLIC', 'UNLISTED'] },
          },
        },
        select: { mediaId: true },
      }),
      this.prismaRead.portfolioItem.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          visibility: { in: ['PUBLIC', 'UNLISTED'] },
          OR: [{ thumbnailId: { not: null } }, { videoId: { not: null } }],
        },
        select: { thumbnailId: true, videoId: true },
      }),
    ]);

    const explicitIds = explicitRows.map((row) => row.id);
    const blogIds = blogPosts
      .map((row) => row.featuredImageId)
      .filter((id): id is string => Boolean(id));
    const portfolioIds = [
      ...portfolioImages.map((row) => row.mediaId),
      ...portfolioHeroes.flatMap((row) =>
        [row.thumbnailId, row.videoId].filter((id): id is string => Boolean(id)),
      ),
    ];

    const candidateIds = [...new Set([...explicitIds, ...blogIds, ...portfolioIds])];
    const existingIds = await this.filterExistingMediaIds(candidateIds);

    const scope: PublicMediaScope = {
      ids: existingIds,
      blogIds: [...new Set(blogIds)].filter((id) => existingIds.includes(id)),
      portfolioIds: [...new Set(portfolioIds)].filter((id) => existingIds.includes(id)),
      explicitIds: [...new Set(explicitIds)].filter((id) => existingIds.includes(id)),
    };

    this.cache = { scope, expires: Date.now() + CACHE_TTL_MS };
    return scope;
  }

  private async filterExistingMediaIds(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return [];

    const chunkSize = 500;
    const found = new Set<string>();
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const rows = await this.prismaRead.media.findMany({
        where: { id: { in: chunk }, deletedAt: null },
        select: { id: true },
      });
      for (const row of rows) found.add(row.id);
    }
    return ids.filter((id) => found.has(id));
  }

  async idsForPublicSource(
    source: 'blog' | 'portfolio' | 'explicit' | undefined,
  ): Promise<string[]> {
    const scope = await this.resolvePublicScope();
    switch (source) {
      case 'blog':
        return scope.blogIds;
      case 'portfolio':
        return scope.portfolioIds;
      case 'explicit':
        return scope.explicitIds;
      default:
        return scope.ids;
    }
  }

  async buildPublicWhere(options?: {
    source?: 'blog' | 'portfolio' | 'explicit';
    contextType?: string;
    uploaderId?: string;
  }): Promise<Record<string, unknown>> {
    let source = options?.source;
    if (!source && options?.contextType) {
      if (options.contextType === 'blog') source = 'blog';
      else if (options.contextType === 'portfolio') source = 'portfolio';
      else if (options.contextType === 'explicit') source = 'explicit';
    }

    const ids = await this.idsForPublicSource(source);
    if (ids.length === 0) {
      return { id: '__no_public_media__' };
    }

    const where: Record<string, unknown> = { id: { in: ids } };
    if (options?.uploaderId) {
      where.uploaderId = options.uploaderId;
    }
    return where;
  }

  invalidateCache(): void {
    this.cache = null;
  }
}
