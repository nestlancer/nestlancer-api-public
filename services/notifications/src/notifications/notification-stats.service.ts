import { Injectable } from '@nestjs/common';
import { PrismaReadService, ReadOnly } from '@nestlancer/database';

@Injectable()
export class NotificationStatsService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  @ReadOnly()
  async getDeliveryStats() {
    return this.prismaRead.notificationDeliveryLog.groupBy({
      by: ['channel', 'status'],
      _count: true,
    });
  }
}
