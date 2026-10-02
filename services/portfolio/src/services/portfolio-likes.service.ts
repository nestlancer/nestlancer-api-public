import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@nestlancer/cache';
import { RateLimitException, isRateLimitEnabled, parseEnvPositiveInt } from '@nestlancer/common';
import { PrismaWriteService } from '@nestlancer/database';

@Injectable()
export class PortfolioLikesService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  async toggleLike(portfolioItemId: string, userId?: string, ipHash?: string) {
    const identity = userId ?? ipHash;
    if (identity) {
      await this.enforceLikeRateLimit(portfolioItemId, identity);
    }

    const item = await this.prismaWrite.portfolioItem.findUnique({
      where: { id: portfolioItemId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Portfolio item not found');

    const identifier = userId ? { userId } : ipHash ? { ipHash } : null;
    if (!identifier) {
      return { liked: false, likeCount: await this.readLikeCount(portfolioItemId) };
    }

    const existing = await this.prismaWrite.portfolioLike.findFirst({
      where: {
        portfolioItemId,
        ...identifier,
      },
    });

    if (existing) {
      await this.prismaWrite.$transaction([
        this.prismaWrite.portfolioLike.delete({ where: { id: existing.id } }),
        this.prismaWrite.portfolioItem.update({
          where: { id: portfolioItemId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      return { liked: false, likeCount: await this.readLikeCount(portfolioItemId) };
    }

    await this.prismaWrite.$transaction([
      this.prismaWrite.portfolioLike.create({
        data: {
          portfolioItemId,
          ...identifier,
        },
      }),
      this.prismaWrite.portfolioItem.update({
        where: { id: portfolioItemId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);
    return { liked: true, likeCount: await this.readLikeCount(portfolioItemId) };
  }

  private async enforceLikeRateLimit(portfolioItemId: string, identity: string): Promise<void> {
    if (!isRateLimitEnabled()) {
      return;
    }
    const windowSeconds = parseEnvPositiveInt(
      process.env.PORTFOLIO_LIKE_RATE_WINDOW_SECONDS,
      this.configService.get<number>('portfolio.likeRateLimitWindowSeconds', 60),
    );
    const maxPerWindow = parseEnvPositiveInt(
      process.env.PORTFOLIO_LIKE_RATE_MAX,
      this.configService.get<number>('portfolio.likeRateLimitMax', 5),
    );
    const rateKey = `ratelimit:portfolio_like:${portfolioItemId}:${identity}`;
    const count = await this.cacheService.incr(rateKey);
    if (count === 1) {
      await this.cacheService.expire(rateKey, windowSeconds);
    }
    if (count > maxPerWindow) {
      throw new RateLimitException(windowSeconds);
    }
  }

  private async readLikeCount(portfolioItemId: string): Promise<number> {
    const item = await this.prismaWrite.portfolioItem.findUnique({
      where: { id: portfolioItemId },
      select: { likeCount: true },
    });
    return item?.likeCount ?? 0;
  }
}
