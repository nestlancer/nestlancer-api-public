import { Module } from '@nestjs/common';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushGatewayController } from './push-gateway.controller';
import { PushSubscriptionGatewayController } from './push-subscription-gateway.controller';

/**
 * Internal notification triggers are intentionally NOT exposed on the public
 * gateway (NL-API-004). Call the notifications service on the Docker network
 * at `/api/v1/internal/notifications/trigger` instead.
 */
@Module({
  controllers: [
    NotificationsController,
    PushGatewayController,
    PushSubscriptionGatewayController,
  ],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
