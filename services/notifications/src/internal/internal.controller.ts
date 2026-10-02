import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsAdminService } from '../notifications/notifications-admin.service';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { ApiStandardResponse, ApiStandardResponses, Public } from '@nestlancer/common';

/**
 * Inter-service notification triggers (Docker network only).
 * Not proxied through the public API gateway (NL-API-004).
 */
@ApiTags('Internal Notifications')
@Controller('internal/notifications')
@Public()
@ApiStandardResponses()
export class InternalController {
  constructor(private readonly adminService: NotificationsAdminService) {}

  /**
   * Triggers a notification from another microservice.
   * Useful for synchronous event-based notifications.
   */
  @Post('trigger')
  @ApiOperation({ summary: 'Trigger an internal notification (inter-service)' })
  @ApiStandardResponse(Object)
  async triggerNotification(@Body() dto: SendNotificationDto): Promise<any> {
    return this.adminService.sendTargeted(dto);
  }
}
