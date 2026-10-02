import { Injectable, Logger } from '@nestjs/common';

import { NotificationJobType } from '@nestlancer/common';
import { PrismaReadService } from '@nestlancer/database';
import { EXCHANGES, QueuePublisherService } from '@nestlancer/queue';

import { BroadcastNotificationDto } from '../dto/broadcast-notification.dto';

@Injectable()
export class NotificationBroadcastService {
  private readonly logger = new Logger(NotificationBroadcastService.name);

  constructor(
    private readonly queuePublisher: QueuePublisherService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async broadcast(dto: BroadcastNotificationDto) {
    this.logger.log(`Broadcasting notification: ${dto.title}`);

    const users = await this.prismaRead.user.findMany({
      where: {
        status: 'ACTIVE',
        ...(dto.excludeUserIds?.length ? { id: { notIn: dto.excludeUserIds } } : {}),
      },
      select: { id: true },
    });

    const broadcastId = `broadcast-${Date.now()}`;
    const userIds = users.map((u) => u.id);

    await this.queuePublisher.publish(EXCHANGES.EVENTS.name, 'notification.broadcast', {
      type: NotificationJobType.BROADCAST_BATCH,
      broadcastId,
      userIds,
      channels: dto.channels,
      notification: {
        title: dto.title,
        message: dto.message,
      },
      scheduledFor: dto.scheduledFor,
    });

    return {
      status: 'scheduled',
      accepted: true,
      scheduledFor: dto.scheduledFor,
      recipientCount: userIds.length,
      broadcastId,
    };
  }
}
