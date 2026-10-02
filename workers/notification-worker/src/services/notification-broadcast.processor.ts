import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { NotificationChannel, NotificationJob, NotificationJobType } from '@nestlancer/common';
import { PrismaReadService } from '@nestlancer/database';
import { NotificationEventType } from '@nestlancer/notifications';

import { NotificationWorkerService } from './notification-worker.service';

const DEFAULT_BATCH_SIZE = 100;

function isBroadcastPayload(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return false;
  const payload = raw as Record<string, unknown>;
  const type = String(payload.type || '');
  return (
    type === 'BROADCAST_BATCH' ||
    type === 'BROADCAST_ANNOUNCEMENT' ||
    Array.isArray(payload.userIds)
  );
}

/**
 * Fans out platform-wide notification broadcasts to individual NotificationJob deliveries.
 */
@Injectable()
export class NotificationBroadcastProcessor {
  private readonly logger = new Logger(NotificationBroadcastProcessor.name);

  constructor(
    private readonly prisma: PrismaReadService,
    private readonly worker: NotificationWorkerService,
    private readonly configService: ConfigService,
  ) {}

  canHandle(raw: unknown, routingKey?: string): boolean {
    if (routingKey === 'notification.broadcast' || routingKey === 'notification.announcement') {
      return true;
    }
    return isBroadcastPayload(raw);
  }

  async process(raw: unknown, routingKey?: string): Promise<void> {
    const payload = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    const type = String(payload.type || '');

    const title = String(
      payload.title ||
        (payload.notification as Record<string, unknown> | undefined)?.title ||
        (payload.payload as Record<string, unknown> | undefined)?.title ||
        'Announcement',
    );
    const message = String(
      payload.message ||
        (payload.notification as Record<string, unknown> | undefined)?.message ||
        (payload.payload as Record<string, unknown> | undefined)?.message ||
        '',
    );
    const actionUrl =
      typeof payload.actionUrl === 'string'
        ? payload.actionUrl
        : typeof (payload.notification as Record<string, unknown> | undefined)?.actionUrl ===
            'string'
          ? String((payload.notification as Record<string, unknown>).actionUrl)
          : undefined;

    const broadcastId = String(
      payload.broadcastId || payload.announcementId || payload.runId || `${Date.now()}`,
    );
    const notificationType =
      type === 'BROADCAST_ANNOUNCEMENT' || routingKey === 'notification.announcement'
        ? NotificationEventType.SYSTEM_ANNOUNCEMENT
        : NotificationEventType.SYSTEM_ANNOUNCEMENT;

    const userIds = await this.resolveTargetUserIds(payload);
    if (!userIds.length) {
      this.logger.warn('[NotificationBroadcast] No target users resolved for broadcast');
      return;
    }

    const batchSize =
      this.configService.get<number>('notificationWorker.broadcastBatchSize') ?? DEFAULT_BATCH_SIZE;
    const channels = this.resolveChannels(payload);

    this.logger.log(
      `[NotificationBroadcast] Delivering "${title}" to ${userIds.length} user(s) (batch=${batchSize})`,
    );

    for (let offset = 0; offset < userIds.length; offset += batchSize) {
      const chunk = userIds.slice(offset, offset + batchSize);
      for (const userId of chunk) {
        const job: NotificationJob = {
          type: NotificationJobType.IN_APP,
          userId,
          notificationType,
          channels,
          notification: {
            title,
            message,
            actionUrl,
            data: {
              broadcastId,
              announcementId: payload.announcementId,
              ...(typeof payload.data === 'object' && payload.data !== null
                ? (payload.data as Record<string, unknown>)
                : {}),
            },
          },
          idempotencyKey: `broadcast:${broadcastId}:${userId}`,
        };
        await this.worker.processNotification(job);
      }
    }
  }

  private resolveChannels(payload: Record<string, unknown>): NotificationChannel[] {
    const raw = payload.channels;
    if (!Array.isArray(raw) || raw.length === 0) {
      return [NotificationChannel.IN_APP];
    }
    return raw
      .map((c) => String(c).toUpperCase())
      .filter((c): c is NotificationChannel =>
        Object.values(NotificationChannel).includes(c as NotificationChannel),
      );
  }

  private async resolveTargetUserIds(payload: Record<string, unknown>): Promise<string[]> {
    if (Array.isArray(payload.userIds) && payload.userIds.length > 0) {
      return payload.userIds.map((id) => String(id));
    }

    const exclude = Array.isArray(payload.excludeUserIds)
      ? payload.excludeUserIds.map((id) => String(id))
      : [];

    const users = await this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        ...(exclude.length ? { id: { notIn: exclude } } : {}),
      },
      select: { id: true },
    });

    return users.map((u) => u.id);
  }
}
