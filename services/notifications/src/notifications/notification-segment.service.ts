import { Injectable } from '@nestjs/common';
import { UserRole } from '@nestlancer/common';
import { PrismaReadService } from '@nestlancer/database';
import { SegmentNotificationDto } from '../dto/segment-notification.dto';
import { NotificationsAdminService } from './notifications-admin.service';

@Injectable()
export class NotificationSegmentService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly adminService: NotificationsAdminService,
  ) {}

  async sendToSegment(dto: SegmentNotificationDto) {
    const roleFilter =
      dto.criteria.role === UserRole.USER || dto.criteria.role === UserRole.ADMIN
        ? dto.criteria.role
        : undefined;

    const users = await this.prismaRead.user.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        ...(roleFilter ? { role: roleFilter } : {}),
      },
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);

    if (userIds.length > 0) {
      await this.adminService.sendTargeted({
        recipientIds: userIds,
        title: dto.notificationPayload.title,
        message: dto.notificationPayload.message,
        type: dto.notificationPayload.type,
      });
    }

    return { segmentedUsersCount: userIds.length };
  }
}
