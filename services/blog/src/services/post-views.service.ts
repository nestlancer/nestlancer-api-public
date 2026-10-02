import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService, ReadOnly } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostViewsService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async recordView(postId: string, viewerKey: string, userAgent?: string, referrer?: string) {
    const debounceHours = this.configService.get<number>('blog.viewDebounceHours', 1);
    const debounceKey = `blog_view:${postId}:${viewerKey}`;
    const ttlSeconds = Math.max(1, debounceHours * 3600);

    let acquired = false;
    try {
      acquired = await this.cacheService.setIfAbsent(debounceKey, '1', ttlSeconds);
    } catch {
      // Redis unavailable — fall through and count the view (analytics over lockout).
      acquired = true;
    }

    if (!acquired) {
      const post = await this.prismaRead.blogPost.findUnique({
        where: { id: postId },
        select: { viewCount: true },
      });
      return { recorded: false, viewCount: post?.viewCount ?? 0 };
    }

    try {
      const updated = await this.prismaWrite.blogPost.update({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });
      return { recorded: true, viewCount: updated.viewCount };
    } catch (err) {
      await this.cacheService.del(debounceKey).catch(() => undefined);
      throw err;
    }
  }
}
