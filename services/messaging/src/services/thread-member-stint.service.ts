import { Injectable } from '@nestjs/common';
import { ChatThreadMemberLeftReason, Prisma } from '@prisma/client';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

import {
  buildMessageVisibilityWhere,
  buildMessageVisibilityWindows,
  resolveMembershipStatus,
  type ThreadMemberStintRow,
} from '../utils/thread-message-visibility.util';

type Tx = Pick<PrismaWriteService, 'chatThreadMemberStint'>;

@Injectable()
export class ThreadMemberStintService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  async getStintsForUserThread(userId: string, threadId: string): Promise<ThreadMemberStintRow[]> {
    return this.prismaRead.chatThreadMemberStint.findMany({
      where: { userId, threadId },
      orderBy: { joinedAt: 'asc' },
      select: {
        joinedAt: true,
        leftAt: true,
        userSentMessage: true,
        leftReason: true,
      },
    });
  }

  async getStintsGroupedByThread(userId: string): Promise<Map<string, ThreadMemberStintRow[]>> {
    const stints = await this.prismaRead.chatThreadMemberStint.findMany({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      select: {
        threadId: true,
        joinedAt: true,
        leftAt: true,
        userSentMessage: true,
        leftReason: true,
      },
    });
    const map = new Map<string, ThreadMemberStintRow[]>();
    for (const stint of stints) {
      const row: ThreadMemberStintRow = {
        joinedAt: stint.joinedAt,
        leftAt: stint.leftAt,
        userSentMessage: stint.userSentMessage,
        leftReason: stint.leftReason,
      };
      const list = map.get(stint.threadId) ?? [];
      list.push(row);
      map.set(stint.threadId, list);
    }
    return map;
  }

  getMembershipStatus(stints: ThreadMemberStintRow[]) {
    return resolveMembershipStatus(stints);
  }

  buildMessageVisibilityWhere(stints: ThreadMemberStintRow[], now = new Date()) {
    return buildMessageVisibilityWhere(stints, now);
  }

  async createActiveStints(tx: Tx, threadId: string, userIds: string[], joinedAt = new Date()) {
    if (userIds.length === 0) return;
    await tx.chatThreadMemberStint.createMany({
      data: userIds.map((userId) => ({
        threadId,
        userId,
        joinedAt,
      })),
    });
  }

  async closeActiveStint(
    tx: Tx,
    threadId: string,
    userId: string,
    leftReason: ChatThreadMemberLeftReason,
    leftAt = new Date(),
  ) {
    await tx.chatThreadMemberStint.updateMany({
      where: { threadId, userId, leftAt: null },
      data: { leftAt, leftReason },
    });
  }

  async markUserSentMessage(userId: string, threadId: string) {
    await this.prismaWrite.chatThreadMemberStint.updateMany({
      where: { threadId, userId, leftAt: null, userSentMessage: false },
      data: { userSentMessage: true },
    });
  }

  async findLatestVisibleMessage(
    threadId: string,
    stints: ThreadMemberStintRow[],
    senderSelect: Prisma.MessageFindFirstArgs['include'],
  ) {
    const visibility = this.buildMessageVisibilityWhere(stints);
    if (!visibility) return null;
    return this.prismaRead.message.findFirst({
      where: {
        threadId,
        deletedAt: null,
        AND: [visibility],
      },
      orderBy: { createdAt: 'desc' },
      include: senderSelect,
    });
  }

  /**
   * Latest visible message per thread for conversation hub rows.
   * One indexed query for every thread, then one fetch of those rows with the
   * same sender include the per-thread findFirst used to return.
   */
  async findLatestVisibleMessagesBatch(
    stintsByThread: Map<string, ThreadMemberStintRow[]>,
    senderSelect: Prisma.MessageFindManyArgs['include'],
  ): Promise<Map<string, any>> {
    const now = new Date();
    const result = new Map<string, any>();
    const windows: Array<{ threadId: string; from: Date; to: Date }> = [];

    for (const [threadId, stints] of stintsByThread) {
      result.set(threadId, null);
      for (const window of buildMessageVisibilityWindows(stints, now)) {
        windows.push({ threadId, from: window.from, to: window.to });
      }
    }

    if (windows.length === 0) return result;

    const values = Prisma.join(
      windows.map((window) => Prisma.sql`(${window.threadId}, ${window.from}, ${window.to})`),
    );
    const rows = await this.prismaRead.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT DISTINCT ON (m."threadId") m.id
      FROM "Message" m
      INNER JOIN (VALUES ${values}) AS w("threadId", "fromTs", "toTs")
        ON m."threadId" = w."threadId"::text
       AND m."createdAt" >= w."fromTs"::timestamptz
       AND m."createdAt" <= w."toTs"::timestamptz
      WHERE m."deletedAt" IS NULL
      ORDER BY m."threadId", m."createdAt" DESC
    `);

    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return result;

    const messages = await this.prismaRead.message.findMany({
      where: { id: { in: ids } },
      include: senderSelect,
    });
    for (const message of messages) {
      if (message.threadId) result.set(message.threadId, message);
    }
    return result;
  }
}

