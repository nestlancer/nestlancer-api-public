import { Injectable, Logger } from '@nestjs/common';

import { CacheService } from '@nestlancer/cache';
import { PrismaReadService } from '@nestlancer/database';

const ADMIN_IDS_CACHE_KEY = 'notifications:admin-ids';
const ADMIN_IDS_TTL_SECONDS = 60;

/**
 * Resolves admin user IDs for broadcast-style notifications (requests, disputes, moderation).
 */
@Injectable()
export class AdminRecipientResolverService {
  private readonly logger = new Logger(AdminRecipientResolverService.name);

  constructor(
    private readonly prisma: PrismaReadService,
    private readonly cache: CacheService,
  ) {}

  async getAllAdminIds(): Promise<string[]> {
    try {
      const cached = await this.cache.get<string[]>(ADMIN_IDS_CACHE_KEY);
      if (cached?.length) return cached;
    } catch (e: unknown) {
      this.logger.warn(`Admin ID cache read failed: ${(e as Error).message}`);
    }

    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE', deletedAt: null },
      select: { id: true },
    });
    const ids = admins.map((a) => a.id);

    try {
      await this.cache.set(ADMIN_IDS_CACHE_KEY, ids, ADMIN_IDS_TTL_SECONDS);
    } catch (e: unknown) {
      this.logger.warn(`Admin ID cache write failed: ${(e as Error).message}`);
    }

    return ids;
  }
}
