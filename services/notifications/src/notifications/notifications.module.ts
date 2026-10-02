import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsRootController } from './notifications-root.controller';
import { NotificationsAdminController } from './notifications.admin.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationBroadcastService } from './notification-broadcast.service';
import { NotificationSegmentService } from './notification-segment.service';
import { DatabaseModule } from '@nestlancer/database';
import { CacheModule } from '@nestlancer/cache';
import { QueueModule } from '@nestlancer/queue';
import { NotificationTemplatesAdminController } from './notification-templates.admin.controller';
import { NotificationTemplatesAdminLegacyController } from './notification-templates.admin-legacy.controller';
import { NotificationTemplatesService } from './notification-templates.service';
import { NotificationStatsService } from './notification-stats.service';
import { NotificationsAdminService } from './notifications-admin.service';

@Module({
  imports: [DatabaseModule.forRoot(), CacheModule.forRoot(), QueueModule.forRoot()],
  controllers: [
    NotificationsRootController,
    NotificationsController,
    NotificationsAdminController,
    NotificationTemplatesAdminController,
    NotificationTemplatesAdminLegacyController,
  ],
  providers: [
    NotificationsService,
    NotificationDeliveryService,
    NotificationBroadcastService,
    NotificationSegmentService,
    NotificationTemplatesService,
    NotificationStatsService,
    NotificationsAdminService,
  ],
  exports: [NotificationsService, NotificationDeliveryService],
})
export class NotificationsModule {}
