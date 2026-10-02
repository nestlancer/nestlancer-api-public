import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';

import { isMessageVisible } from '../utils/thread-message-visibility.util';
import { ThreadMemberStintService } from './thread-member-stint.service';

@Injectable()
export class MessageSearchService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly stints: ThreadMemberStintService,
  ) {}

  async searchMessages(projectId: string, query: string, page = 1, limit = 20) {
    if (!query) {
      return { items: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prismaRead.message.findMany({
        where: {
          projectId,
          deletedAt: null,
          content: { contains: query, mode: 'insensitive' },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      this.prismaRead.message.count({
        where: {
          projectId,
          deletedAt: null,
          content: { contains: query, mode: 'insensitive' },
        },
      }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async searchThreadMessages(
    userId: string,
    threadId: string,
    query: string,
    page = 1,
    limit = 20,
  ) {
    if (!query) {
      return { items: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const userStints = await this.stints.getStintsForUserThread(userId, threadId);
    const visibility = this.stints.buildMessageVisibilityWhere(userStints);
    if (!visibility) {
      return { items: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }

    const skip = (page - 1) * limit;
    const baseWhere = {
      threadId,
      deletedAt: null,
      content: { contains: query, mode: 'insensitive' as const },
      AND: [visibility],
    };

    const [items, total] = await Promise.all([
      this.prismaRead.message.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      this.prismaRead.message.count({ where: baseWhere }),
    ]);

    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async searchAllForUser(userId: string, query: string, page = 1, limit = 20) {
    if (!query) {
      return { items: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }
    const projects = await this.prismaRead.project.findMany({
      where: { OR: [{ clientId: userId }, { adminId: userId }] },
      select: { id: true },
    });
    const projectIds = projects.map((p) => p.id);

    const stintsByThread = await this.stints.getStintsGroupedByThread(userId);
    const threadIds = [...stintsByThread.keys()];

    if (projectIds.length === 0 && threadIds.length === 0) {
      return { items: [], meta: { total: 0, page, limit, totalPages: 0 } };
    }
    const skip = (page - 1) * limit;
    const [rawItems, rawTotal] = await Promise.all([
      this.prismaRead.message.findMany({
        where: {
          deletedAt: null,
          content: { contains: query, mode: 'insensitive' },
          OR: [
            ...(projectIds.length ? [{ projectId: { in: projectIds } }] : []),
            ...(threadIds.length ? [{ threadId: { in: threadIds } }] : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit * 3,
        include: {
          sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      }),
      this.prismaRead.message.count({
        where: {
          deletedAt: null,
          content: { contains: query, mode: 'insensitive' },
          OR: [
            ...(projectIds.length ? [{ projectId: { in: projectIds } }] : []),
            ...(threadIds.length ? [{ threadId: { in: threadIds } }] : []),
          ],
        },
      }),
    ]);

    const items = rawItems
      .filter((m) => {
        if (m.projectId) return true;
        if (!m.threadId) return false;
        const stints = stintsByThread.get(m.threadId) ?? [];
        return isMessageVisible(m.createdAt, stints);
      })
      .slice(0, limit);

    const total = rawTotal;
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
