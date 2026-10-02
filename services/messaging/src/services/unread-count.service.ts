import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaReadService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';

import { ThreadUserPrefsService } from './thread-user-prefs.service';

const UNREAD_CACHE_TTL_SEC = 45;

@Injectable()
export class UnreadCountService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly cacheService: CacheService,
    private readonly userPrefs: ThreadUserPrefsService,
  ) {}

  cacheKeyFor(userId: string): string {
    return `messaging:unread:${userId}`;
  }

  /** Bust cached unread totals after send/read so hub + header stay in sync (NL-MSG-003). */
  async invalidateForUsers(userIds: Array<string | null | undefined>): Promise<void> {
    const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
    await Promise.all(unique.map((id) => this.cacheService.del(this.cacheKeyFor(id))));
  }

  async getUnreadCount(userId: string) {
    const cacheKey = this.cacheKeyFor(userId);
    const cached = await this.cacheService.get<{ totalUnread: number }>(cacheKey);
    if (cached != null) {
      return cached;
    }

    // NL-BUG-MSG-1: hub `/conversations` lists ChatThreads only (see ConversationsService /
    // NL-BUG-MSG-001). Counting orphan project-stream messages inflated "Unread messages"
    // while "Unread threads" stayed 0. Keep the badge aligned with hub-visible threads.
    const memberships = await this.prismaRead.chatThreadMember.findMany({
      where: { userId },
      select: { threadId: true },
    });
    const memberThreadIds = [...new Set(memberships.map((m) => m.threadId))];

    const stintRows = await this.prismaRead.chatThreadMemberStint.findMany({
      where: { userId },
      select: { threadId: true },
      distinct: ['threadId'],
    });
    const stintThreadIds = stintRows.map((s) => s.threadId);
    const allThreadIds = [...new Set([...memberThreadIds, ...stintThreadIds])];

    const threads =
      allThreadIds.length > 0
        ? await this.prismaRead.chatThread.findMany({
            where: { id: { in: allThreadIds } },
            select: { id: true, archivedAt: true },
          })
        : [];
    const prefsByThread = await this.userPrefs.getPrefsForUserThreads(userId, allThreadIds);

    const threadIds = threads
      .filter((t) => {
        if (t.archivedAt) return false;
        const prefs = prefsByThread.get(t.id);
        if (this.userPrefs.isHidden(prefs)) return false;
        if (this.userPrefs.isUserArchived(prefs)) return false;
        return true;
      })
      .map((t) => t.id);

    if (threadIds.length === 0) {
      const empty = { totalUnread: 0 };
      await this.cacheService.set(cacheKey, empty, UNREAD_CACHE_TTL_SEC);
      return empty;
    }

    const rows = await this.prismaRead.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int AS count
      FROM "Message" m
      WHERE m."deletedAt" IS NULL
        AND m."senderId" != ${userId}
        AND m."threadId" IN (${Prisma.join(threadIds)})
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(m."readBy"::jsonb, '[]'::jsonb)) AS elem
          WHERE elem->>'userId' = ${userId}
        )
    `;

    const result = { totalUnread: rows[0]?.count ?? 0 };
    await this.cacheService.set(cacheKey, result, UNREAD_CACHE_TTL_SEC);
    return result;
  }
}
