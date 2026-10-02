import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { DatabaseModule } from '@nestlancer/database';
import { NotificationsAdminService } from '../notifications/notifications-admin.service';

@Module({
  imports: [NotificationsModule, DatabaseModule],
  controllers: [InternalController],
  providers: [NotificationsAdminService],
})
export class InternalModule {}
