import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Pool } from 'pg';
import { PrismaReadService, createPgPool } from '@nestlancer/database';
import { StorageService } from '@nestlancer/storage';
import { resolveMediaCoverUrl } from '../utils/media-cover-url.util';

type PostWithFeaturedImage = {
  featuredImageId?: string | null;
  seo?: unknown;
};

@Injectable()
export class PostFeaturedImageService implements OnModuleInit {
  private readonly bucket: string;
  private readonly expiresIn: number;
  private mediaPool: Pool | null = null;

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly storage: StorageService,
    configService: ConfigService,
  ) {
    this.bucket = process.env.STORAGE_BUCKET_PRIVATE || 'nestlancer-private';
    this.expiresIn = configService.get<number>('blog.presignedUrlExpiry', 3600);
    // Cover rows are read through pg. Prisma stays injected so existing providers do not change.
    void this.prismaRead;
  }

  private readPool(): Pool {
    if (!this.mediaPool) {
      const connectionString = process.env.DATABASE_READ_URL || process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL or DATABASE_READ_URL must be set');
      }
      this.mediaPool = createPgPool(connectionString, { max: 2 });
    }
    return this.mediaPool;
  }

  async onModuleInit(): Promise<void> {
    if (!process.env.DATABASE_READ_URL && !process.env.DATABASE_URL) return;
    const pool = this.readPool();
    await Promise.all([
      pool.query('SELECT 1'),
      pool.query('SELECT 1'),
      // First SigV4 call initializes the presign client. Pay that cost before listen.
      this.storage
        .getSignedUrl({ bucket: this.bucket, key: 'warmup', expiresIn: 60, operation: 'get' })
        .catch(() => undefined),
    ]);
  }

  async enrichPost<T extends PostWithFeaturedImage>(post: T): Promise<T> {
    const [enriched] = await this.enrichPosts([post]);
    return enriched;
  }

  async enrichPosts<T extends PostWithFeaturedImage>(posts: T[]): Promise<T[]> {
    const inline = posts.filter(
      (post) => post && typeof post === 'object' && 'featuredMedia' in (post as object),
    ) as Array<T & { featuredMedia?: Record<string, unknown> | null }>;
    await Promise.all(
      inline.map(async (post) => {
        const media = post.featuredMedia;
        delete post.featuredMedia;
        if (!media) return;
        await this.applyCover(post, media);
      }),
    );

    const ids = [
      ...new Set(
        posts
          .filter((post) => post.featuredImageId && !this.hasCover(post))
          .map((post) => post.featuredImageId)
          .filter(Boolean),
      ),
    ] as string[];
    if (ids.length === 0) return posts;

    const mediaResult = await this.readPool().query(
      `SELECT id, metadata, urls, status
       FROM "Media"
       WHERE id = ANY($1::text[])
         AND status IN ('READY'::"MediaStatus", 'PROCESSING'::"MediaStatus")
         AND "deletedAt" IS NULL`,
      [ids],
    );
    const mediaRows = mediaResult.rows;
    const mediaById = new Map(mediaRows.map((m) => [m.id, m]));

    return Promise.all(
      posts.map(async (post) => {
        if (!post.featuredImageId || this.hasCover(post)) return post;
        const media = mediaById.get(post.featuredImageId);
        if (!media) return post;
        return this.applyCover(post, media as Record<string, unknown>);
      }),
    );
  }

  private hasCover(post: PostWithFeaturedImage): boolean {
    const seo = post.seo;
    return Boolean(seo && typeof seo === 'object' && (seo as { ogImage?: unknown }).ogImage);
  }

  private async applyCover<T extends PostWithFeaturedImage>(
    post: T,
    media: Record<string, unknown>,
  ): Promise<T> {
    const coverUrl = await resolveMediaCoverUrl(media, this.storage, this.bucket, this.expiresIn);
    if (!coverUrl || this.hasCover(post)) return post;
    const seo =
      post.seo && typeof post.seo === 'object' ? { ...(post.seo as Record<string, unknown>) } : {};
    seo.ogImage = coverUrl;
    post.seo = seo;
    return post;
  }
}
