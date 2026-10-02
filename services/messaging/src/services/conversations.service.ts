import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';

import { ThreadMemberStintService } from './thread-member-stint.service';
import { ThreadUserPrefsService } from './thread-user-prefs.service';

const SENDER_SELECT = { id: true, firstName: true, lastName: true, avatar: true } as const;

type PersonName = { firstName: string; lastName: string };

function formatPersonName(person?: PersonName | null): string | null {
  if (!person) return null;
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
  return name || null;
}

function mapLatestMessageForUser(message: unknown, userId: string): Record<string, unknown> | null {
  if (!message || typeof message !== 'object') return null;
  const msg = message as {
    readBy?: Array<{ userId?: string; readAt?: Date | string }>;
    sender?: { id?: string; firstName?: string; lastName?: string; avatar?: string | null };
    [key: string]: unknown;
  };
  const readBy = Array.isArray(msg.readBy) ? msg.readBy : [];
  const receipt = readBy.find((r) => r.userId === userId);
  const readAt = receipt?.readAt ? new Date(receipt.readAt).toISOString() : undefined;
  return {
    ...msg,
    readAt,
  };
}

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly stints: ThreadMemberStintService,
    private readonly userPrefs: ThreadUserPrefsService,
  ) {}

  async getConversations(
    userId: string,
    query: { page?: number; limit?: number; filter?: 'active' | 'archived' },
  ) {
    const filter = query.filter === 'archived' ? 'archived' : 'active';
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // NL-BUG-MSG-001: hub lists real ChatThreads only. Project message streams
    // (no ChatThread) previously appeared as threadId:null rows and inflated
    // /conversations vs /threads. Those remain reachable via /messages/project/{id}.

    const stintsByThread = await this.stints.getStintsGroupedByThread(userId);
    const threadIds = [...stintsByThread.keys()];
    const [prefsByThread, threads] = await Promise.all([
      this.userPrefs.getPrefsForUserThreads(userId, threadIds),
      this.prismaRead.chatThread.findMany({
      where: { id: { in: threadIds } },
      // Soft cap hub scan — users with more threads still get newest-updated first.
      take: 100,
      orderBy: { updatedAt: 'desc' },
      include: {
        members: {
          include: { user: { select: SENDER_SELECT } },
        },
      },
    }),
    ]);

    const threadStintMap = new Map<string, typeof stintsByThread extends Map<string, infer V> ? V : never>();
    for (const t of threads) {
      const stints = stintsByThread.get(t.id);
      if (stints) threadStintMap.set(t.id, stints);
    }
    const latestMessageByThread = await this.stints.findLatestVisibleMessagesBatch(
      threadStintMap,
      { sender: { select: SENDER_SELECT } },
    );

    type Row = {
      kind: 'THREAD';
      sortAt: Date;
      threadId: string;
      threadType: string;
      title: string | null;
      participantIds: string[];
      membershipStatus: 'ACTIVE' | 'LEFT' | 'REMOVED';
      isArchived?: boolean;
      latestMessage: unknown;
    };

    const rows: Row[] = [];

    for (const t of threads) {
      const prefs = prefsByThread.get(t.id);
      if (this.userPrefs.isHidden(prefs)) continue;

      const globallyArchived = Boolean(t.archivedAt);
      const userArchived = this.userPrefs.isUserArchived(prefs);

      if (filter === 'active') {
        if (globallyArchived || userArchived) continue;
      } else if (!globallyArchived && !userArchived) {
        continue;
      }

      const userStints = stintsByThread.get(t.id) ?? [];
      const membershipStatus = this.stints.getMembershipStatus(userStints) ?? 'ACTIVE';
      const latest = latestMessageByThread.get(t.id) ?? null;
      const sortAt = latest?.createdAt ?? t.updatedAt;

      const participantIds = t.members.map((m) => m.userId);
      let title = t.title;

      if (t.type === 'DIRECT' && !title?.trim()) {
        const peer = t.members.find((m) => m.userId !== userId);
        title = formatPersonName(peer?.user) ?? title;
      }

      rows.push({
        kind: 'THREAD',
        sortAt,
        threadId: t.id,
        threadType: t.type,
        title,
        participantIds,
        membershipStatus,
        isArchived: globallyArchived || userArchived,
        latestMessage: latest,
      });
    }

    rows.sort((a, b) => b.sortAt.getTime() - a.sortAt.getTime());

    // NL-MSG-004: collapse duplicate GROUP rows with the same title + membership fingerprint.
    const dedupedRows: Row[] = [];
    const seenGroupKeys = new Set<string>();
    for (const row of rows) {
      if (row.threadType === 'GROUP') {
        const titleKey = (row.title ?? '').trim().toLowerCase();
        const membersKey = [...row.participantIds].map(String).sort().join(',');
        const key = `${titleKey}|${membersKey}`;
        if (titleKey && seenGroupKeys.has(key)) continue;
        if (titleKey) seenGroupKeys.add(key);
      }
      dedupedRows.push(row);
    }

    const total = dedupedRows.length;
    const slice = dedupedRows.slice(skip, skip + limit);

    const items = slice.map((r) => ({
      kind: 'THREAD' as const,
      threadId: r.threadId,
      threadType: r.threadType,
      title: r.title,
      participantIds: r.participantIds,
      membershipStatus: r.membershipStatus,
      isArchived: r.isArchived,
      latestMessage: mapLatestMessageForUser(r.latestMessage, userId),
    }));

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}
