import { Injectable } from '@nestjs/common';

function withReadFlag<T extends { read?: boolean | null; readAt?: Date | null }>(item: T) {
  const isRead = item.read === true || item.readAt != null;
  return { ...item, read: isRead, isRead };
}

/** Map UI tab names (payments/projects/…) onto Prisma `type` filters (NL-NOTIF-002). */
function categoryTypeFilter(type: string): { startsWith: string; mode: 'insensitive' } | null {
  const raw = type.trim().toLowerCase();
  const map: Record<string, string> = {
    payments: 'payment',
    payment: 'payment',
    projects: 'project',
    project: 'project',
    messages: 'message',
    message: 'message',
    quotes: 'quote',
    quote: 'quote',
    system: 'system',
    account: 'account',
  };
  const prefix = map[raw];
  if (!prefix) return null;
  return { startsWith: prefix, mode: 'insensitive' };
}

import { PrismaWriteService, PrismaReadService, ReadOnly } from '@nestlancer/database';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import {
  buildPrismaSkipTake,
  createPaginationMeta,
  ResourceNotFoundException,
} from '@nestlancer/common';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  @ReadOnly()
  async findByUser(userId: string, query: QueryNotificationsDto) {
    const { skip, take } = buildPrismaSkipTake(query.page, query.limit);

    const where: any = {
      userId,
    };

    if (query.type) {
      const category = categoryTypeFilter(query.type);
      if (category) {
        where.type = category;
      } else if (['info', 'success', 'warning', 'error'].includes(query.type)) {
        where.type = query.type;
      } else {
        where.type = { contains: query.type, mode: 'insensitive' };
      }
    }

    if (query.unreadOnly) {
      where.readAt = null;
    }

    const [items, total] = await Promise.all([
      this.prismaRead.notification.findMany({
        where,
        skip,
        take,
        orderBy: query.sort
          ? { [query.sort.split(':')[0]]: query.sort.split(':')[1] || 'desc' }
          : { createdAt: 'desc' },
      }),
      this.prismaRead.notification.count({ where }),
    ]);

    return {
      data: items.map((item) => withReadFlag(item)),
      pagination: createPaginationMeta(total, query.page, query.limit),
    };
  }

  @ReadOnly()
  async getHistory(userId: string, query: QueryNotificationsDto) {
    const { skip, take } = buildPrismaSkipTake(query.page, query.limit);

    const where: any = { userId };
    if (query.type) {
      const category = categoryTypeFilter(query.type);
      if (category) {
        where.type = category;
      } else if (['info', 'success', 'warning', 'error'].includes(query.type)) {
        where.type = query.type;
      } else {
        where.type = { contains: query.type, mode: 'insensitive' };
      }
    }

    const [items, total] = await Promise.all([
      this.prismaRead.notification.findMany({
        where,
        skip,
        take,
        orderBy: query.sort
          ? { [query.sort.split(':')[0]]: query.sort.split(':')[1] || 'desc' }
          : { createdAt: 'desc' },
      }),
      this.prismaRead.notification.count({ where }),
    ]);

    return {
      data: items.map((item) => withReadFlag(item)),
      pagination: createPaginationMeta(total, query.page, query.limit),
    };
  }

  @ReadOnly()
  async getUnreadCount(userId: string) {
    const count = await this.prismaRead.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });

    return { count };
  }

  async findByIdAndUser(id: string, userId: string) {
    const notification = await this.prismaWrite.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new ResourceNotFoundException('Notification', id);
    }

    if (!notification.readAt) {
      return this.markRead(id, userId, true);
    }

    return withReadFlag(notification);
  }

  async markRead(id: string, userId: string, read: boolean) {
    const notification = await this.prismaWrite.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new ResourceNotFoundException('Notification', id);
    }

    const updated = await this.prismaWrite.notification.update({
      where: { id },
      data: { read, readAt: read ? new Date() : null },
    });
    return withReadFlag(updated);
  }

  async markAllRead(userId: string) {
    return this.prismaWrite.notification.updateMany({
      where: { userId, readAt: null },
      data: { read: true, readAt: new Date() },
    });
  }

  async markSelectedRead(userId: string, notificationIds: string[]) {
    return this.prismaWrite.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: { read: true, readAt: new Date() },
    });
  }

  async clearRead(userId: string) {
    return this.prismaWrite.notification.deleteMany({
      where: { userId, readAt: { not: null } },
    });
  }

  async softDelete(id: string, userId: string) {
    return this.prismaWrite.notification.deleteMany({
      where: { id, userId },
    });
  }

  async sendTestNotification(userId: string) {
    await this.prismaWrite.notification.create({
      data: {
        userId,
        type: 'test',
        title: 'Test notification',
        message: 'This is a test notification.',
      },
    });
    return { sent: true };
  }
}
