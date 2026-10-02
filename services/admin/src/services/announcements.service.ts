import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { generateUuid } from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { CacheService } from '@nestlancer/cache';
import { EXCHANGES, QueuePublisherService } from '@nestlancer/queue';
import { SendAnnouncementDto } from '../dto/send-announcement.dto';

const ANNOUNCEMENTS_CONFIG_KEY = 'system.announcements';
const MAX_STORED_ANNOUNCEMENTS = 50;
const CREATE_BATCH_SIZE = 100;

/**
 * Broadcasts platform announcements to all active users.
 * Writes in-app notifications immediately (does not wait on the notification queue backlog),
 * then also publishes a queue event for email/push / realtime fan-out.
 */
@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly queueService: QueuePublisherService,
    private readonly cacheService: CacheService,
  ) {}

  async send(dto: SendAnnouncementDto, adminId: string) {
    const now = new Date();
    const announcement = {
      id: generateUuid(),
      title: dto.title,
      message: dto.message,
      type: dto.type,
      dismissable: dto.dismissable ?? true,
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdBy: adminId,
      createdAt: now,
      sentAt: null as Date | null,
    };

    const users = await this.prismaRead.user.findMany({
      where: {
        status: 'ACTIVE',
        // Admins already see the banner from the console; still notify clients.
        role: { not: 'ADMIN' },
      },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    let delivered = 0;
    if (!dto.scheduledFor && userIds.length > 0) {
      delivered = await this.deliverInApp(announcement, userIds);
      announcement.sentAt = now;

      // Also enqueue for email/push / WS when the worker catches up.
      await this.queueService.publish(EXCHANGES.EVENTS.name, 'notification.broadcast', {
        type: 'BROADCAST_ANNOUNCEMENT',
        broadcastId: announcement.id,
        announcementId: announcement.id,
        title: announcement.title,
        message: announcement.message,
        channels: ['IN_APP'],
        userIds,
        payload: announcement,
      });
    }

    await this.persistAnnouncement(announcement, adminId);

    this.logger.log(
      `Announcement ${announcement.id} delivered in-app to ${delivered}/${userIds.length} user(s)`,
    );

    return {
      ...announcement,
      recipientCount: userIds.length,
      deliveredCount: delivered,
    };
  }

  private async deliverInApp(
    announcement: {
      id: string;
      title: string;
      message: string;
      type: string;
    },
    userIds: string[],
  ): Promise<number> {
    let created = 0;
    for (let i = 0; i < userIds.length; i += CREATE_BATCH_SIZE) {
      const chunk = userIds.slice(i, i + CREATE_BATCH_SIZE);
      const rows = chunk.map((userId) => ({
        id: generateUuid(),
        userId,
        type: 'system.announcement',
        title: announcement.title,
        message: announcement.message,
        priority: announcement.type === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        data: {
          announcementId: announcement.id,
          severity: announcement.type,
          dismissable: true,
        } as Prisma.InputJsonValue,
        channels: ['IN_APP'] as Prisma.InputJsonValue,
        idempotencyKey: `broadcast:${announcement.id}:${userId}`,
      }));

      try {
        const result = await this.prismaWrite.notification.createMany({
          data: rows as Prisma.NotificationCreateManyInput[],
          skipDuplicates: true,
        });
        created += result.count;
      } catch (err) {
        this.logger.error(
          `Failed to create announcement notifications batch offset=${i}: ${(err as Error).message}`,
        );
      }

      // Best-effort realtime push (same Redis as cache; ws-gateway may use a dedicated pub/sub Redis).
      try {
        const redis = this.cacheService.getClient();
        for (const userId of chunk) {
          const payload = JSON.stringify({
            event: 'notification.new',
            data: {
              type: 'system.announcement',
              title: announcement.title,
              message: announcement.message,
              announcementId: announcement.id,
            },
            timestamp: new Date().toISOString(),
          });
          await redis.publish(`ws:user:${userId}`, payload);
        }
      } catch (err) {
        this.logger.warn(`WS publish skipped: ${(err as Error).message}`);
      }
    }
    return created;
  }

  private async persistAnnouncement(
    announcement: Record<string, unknown>,
    adminId: string,
  ): Promise<void> {
    const existing = await this.prismaWrite.systemConfig.findUnique({
      where: { key: ANNOUNCEMENTS_CONFIG_KEY },
    });
    const previous = Array.isArray(existing?.value) ? (existing.value as unknown[]) : [];
    const next = [announcement, ...previous].slice(0, MAX_STORED_ANNOUNCEMENTS);

    await this.prismaWrite.systemConfig.upsert({
      where: { key: ANNOUNCEMENTS_CONFIG_KEY },
      create: {
        key: ANNOUNCEMENTS_CONFIG_KEY,
        value: next as Prisma.InputJsonValue,
        description: 'Recent platform announcements (newest first)',
        updatedBy: adminId,
      },
      update: {
        value: next as Prisma.InputJsonValue,
        updatedBy: adminId,
      },
    });
  }
}
