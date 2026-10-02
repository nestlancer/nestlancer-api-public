import { Injectable, Logger } from '@nestjs/common';

import { NotificationJob } from '@nestlancer/common';
import { PrismaWriteService } from '@nestlancer/database';

import { NotificationMetricsService } from '../services/notification-metrics.service';
import { RedisPublisherService } from '../services/redis-publisher.service';

@Injectable()
export class InAppNotificationProcessor {
  private readonly logger = new Logger(InAppNotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly redisPublisher: RedisPublisherService,
    private readonly metrics: NotificationMetricsService,
  ) {}

  async process(job: NotificationJob): Promise<void> {
    const { userId, notification, priority } = job;
    const notificationType =
      job.notificationType ||
      (typeof notification.data?.type === 'string' ? notification.data.type : undefined) ||
      job.type;

    this.logger.log(`Processing in-app notification for user ${userId} type=${notificationType}`);

    try {
      if (job.idempotencyKey) {
        const existing = await this.prisma.notification.findFirst({
          where: { idempotencyKey: job.idempotencyKey } as Record<string, string>,
        });
        if (existing) {
          this.logger.debug(`Skipping duplicate notification idempotencyKey=${job.idempotencyKey}`);
          return;
        }
      }

      const created = await this.prisma.notification.create({
        data: {
          userId,
          type: notificationType,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          actionUrl: notification.actionUrl,
          priority: (priority as any) || 'NORMAL',
          channels: job.channels,
          ...(job.idempotencyKey ? { idempotencyKey: job.idempotencyKey } : {}),
        } as Parameters<typeof this.prisma.notification.create>[0]['data'],
      });

      const unreadCount = await this.prisma.notification.count({
        where: { userId, readAt: null },
      });

      await this.redisPublisher.publish(`user:${userId}`, 'notification.new', created);
      await this.redisPublisher.publish(`user:${userId}`, 'unreadCount.updated', {
        unread: unreadCount,
      });

      this.metrics.recordCreated(notificationType);
      this.logger.log(`In-app notification created for user ${userId}: ${created.id}`);
    } catch (error: any) {
      if (error?.code === 'P2002' && job.idempotencyKey) {
        this.logger.debug(`Duplicate notification ignored: ${job.idempotencyKey}`);
        return;
      }
      this.logger.error(`Failed to process in-app notification for user ${userId}:`, error);
      throw error;
    }
  }
}
