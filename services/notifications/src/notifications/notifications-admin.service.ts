import { Injectable } from '@nestjs/common';

import { NotificationChannel, NotificationJobType } from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService, ReadOnly } from '@nestlancer/database';
import { EXCHANGES, QueuePublisherService } from '@nestlancer/queue';

import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { buildPrismaSkipTake, createPaginationMeta } from '@nestlancer/common';

@Injectable()
export class NotificationsAdminService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly queuePublisher: QueuePublisherService,
  ) {}

  @ReadOnly()
  async findAll(query: QueryNotificationsDto) {
    const { skip, take } = buildPrismaSkipTake(query.page, query.limit);

    const where: any = {};
    if (query.type) {
      where.type = query.type;
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
      data: items,
      pagination: createPaginationMeta(total, query.page, query.limit),
    };
  }

  @ReadOnly()
  async getStats() {
    const totalCount = await this.prismaRead.notification.count();
    const unreadCount = await this.prismaRead.notification.count({ where: { readAt: null } });

    return {
      totalCount,
      unreadCount,
    };
  }

  @ReadOnly()
  async getDeliveryReport(notificationId: string) {
    // Prefer a concrete client if the delivery log model is available; otherwise
    // fall back to an empty list so the endpoint remains stable even when the
    // underlying schema does not yet expose delivery logs.
    const deliveryLogClient =
      (this.prismaRead as any).notificationDeliveryLog ||
      (this.prismaWrite as any).notificationDeliveryLog;

    if (!deliveryLogClient) {
      return [];
    }

    return deliveryLogClient.findMany({
      where: { notificationId },
    });
  }

  async sendTargeted(dto: SendNotificationDto) {
    const notificationType = dto.type || 'system.announcement';
    const channels = (dto.channels || ['IN_APP']).map((c) =>
      String(c).toUpperCase() === 'EMAIL'
        ? NotificationChannel.EMAIL
        : String(c).toUpperCase() === 'PUSH'
          ? NotificationChannel.PUSH
          : NotificationChannel.IN_APP,
    );
    const batchId = `admin-targeted-${Date.now()}`;

    for (const userId of dto.recipientIds) {
      await this.queuePublisher.publish(
        EXCHANGES.EVENTS.name,
        'notification.notification.created',
        {
          type: NotificationJobType.IN_APP,
          userId,
          notificationType,
          channels,
          notification: {
            title: dto.title,
            message: dto.message,
            data: { type: notificationType, batchId },
          },
          idempotencyKey: `${batchId}:${userId}`,
        },
      );
    }

    return { queued: dto.recipientIds.length };
  }

  async clearUserNotifications(userId: string) {
    return this.prismaWrite.notification.deleteMany({
      where: { userId },
    });
  }
}
