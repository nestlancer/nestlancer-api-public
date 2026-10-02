import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService, ReadOnly } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PortfolioAnalyticsService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async trackView(itemId: string, ipHash: string, _userAgent?: string, _referrer?: string) {
    const debounceHours = this.configService.get<number>('portfolio.viewDebounceHours', 1);
    const debounceKey = `portfolio_view:${itemId}:${ipHash}`;

    const recentlyViewed = await this.cacheService.get(debounceKey);
    if (!recentlyViewed) {
      const updated = await this.prismaWrite.portfolioItem.update({
        where: { id: itemId },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });
      await this.cacheService.set(debounceKey, '1', debounceHours * 3600);
      return { recorded: true, viewCount: updated.viewCount };
    }

    const item = await this.prismaRead.portfolioItem.findUnique({
      where: { id: itemId },
      select: { viewCount: true },
    });
    return { recorded: false, viewCount: item?.viewCount ?? 0 };
  }

  @ReadOnly()
  async getGlobalAnalytics() {
    const agg = await this.prismaRead.portfolioItem.aggregate({
      _sum: {
        viewCount: true,
        likeCount: true,
      },
    });

    const topItems = await this.prismaRead.portfolioItem.findMany({
      orderBy: { viewCount: 'desc' },
      take: 10,
      select: { id: true, title: true, viewCount: true, likeCount: true },
    });

    return {
      totalViews: agg._sum.viewCount || 0,
      totalLikes: agg._sum.likeCount || 0,
      topItems,
    };
  }

  @ReadOnly()
  async getItemAnalytics(id: string) {
    const item = await this.prismaRead.portfolioItem.findUnique({
      where: { id },
      select: { viewCount: true, likeCount: true, createdAt: true },
    });

    return item;
  }
}
