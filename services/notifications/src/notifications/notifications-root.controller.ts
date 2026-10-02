import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@nestlancer/auth-lib';
import { ApiStandardResponse, ApiStandardResponses } from '@nestlancer/common';
import { NotificationsService } from './notifications.service';

/**
 * Root controller for the notifications service.
 * Handles health checks and public/generic endpoints.
 */
@ApiTags('Notifications/Root')
@Controller()
@ApiStandardResponses()
export class NotificationsRootController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Evaluates the operational readiness of the Notifications service.
   *
   * @returns A promise resolving to the physical health status of the service
   */
  @Get('health')
  @ApiOperation({
    summary: 'Service health check',
    description: 'Confirm that the notifications microservice is reachable and operational.',
  })
  async health(): Promise<any> {
    return { status: 'ok', service: 'notifications' };
  }

  /**
   * Sends a test notification to the current user.
   */
  @Post('test')
  @ApiOperation({ summary: 'Send test notification' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiStandardResponse(Object)
  async sendTest(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    await this.notificationsService.sendTestNotification(user.userId);
    return { sent: true };
  }
}
