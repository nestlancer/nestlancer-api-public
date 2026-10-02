import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationsAdminService } from './notifications-admin.service';
import { NotificationBroadcastService } from './notification-broadcast.service';
import { NotificationSegmentService } from './notification-segment.service';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { BroadcastNotificationDto } from '../dto/broadcast-notification.dto';
import { SegmentNotificationDto } from '../dto/segment-notification.dto';
import {
  ApiPaginated,
  ApiStandardResponse,
  ApiStandardResponses,
  UserRole,
} from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { JwtAuthGuard, RolesGuard, Roles } from '@nestlancer/auth-lib';

/**
 * Controller for administrative notification operations.
 * Allows managing all notifications, broadcasting, and targeting segments.
 */
@ApiTags('Admin/Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiStandardResponses()
export class NotificationsAdminController {
  constructor(
    private readonly adminService: NotificationsAdminService,
    private readonly broadcastService: NotificationBroadcastService,
    private readonly segmentService: NotificationSegmentService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Retrieves a global, paginated registry of all notifications within the platform.
   *
   * @param query Global filtering and pagination criteria
   * @returns A promise resolving to a paginated set of all system notifications
   */
  @Get()
  @ApiOperation({
    summary: 'Get all notifications (Admin)',
    description: 'Access the global repository of notification records for audit and review.',
  })
  @ApiPaginated()
  async getAllNotifications(@Query() query: QueryNotificationsDto): Promise<any> {
    return this.adminService.findAll(query);
  }

  /**
   * Retrieves aggregated system-wide notification delivery and engagement analytics.
   *
   * @returns A promise resolving to a statistical overview of notification performance
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get notification statistics',
    description: 'Monitor high-level notification volume and status distribution platform-wide.',
  })
  @ApiStandardResponse(Object)
  async getStats(): Promise<any> {
    return this.adminService.getStats();
  }

  /**
   * Retrieves a delivery report for a specific notification.
   */
  @Get('delivery-report')
  @ApiOperation({ summary: 'Get delivery report' })
  @ApiStandardResponse(Object)
  async getDeliveryReport(@Query('notificationId') id: string): Promise<any> {
    return this.adminService.getDeliveryReport(id);
  }

  /**
   * Sends a targeted notification to specific recipients.
   */
  @Post('send')
  @ApiOperation({ summary: 'Send targeted notification' })
  @ApiStandardResponse(Object)
  @ApiResponse({ status: 201, description: 'Notification sent successfully' })
  async sendNotification(@Body() dto: SendNotificationDto): Promise<any> {
    return this.adminService.sendTargeted(dto);
  }

  /**
   * Broadcasts a notification to all active users.
   */
  @Post('broadcast')
  @ApiOperation({ summary: 'Broadcast notification to all users' })
  @ApiStandardResponse(Object)
  @HttpCode(200)
  async broadcastNotification(@Body() dto: BroadcastNotificationDto): Promise<any> {
    return this.broadcastService.broadcast(dto);
  }

  /**
   * Sends a notification to a specific user segment based on criteria.
   */
  @Post('segment')
  @ApiOperation({ summary: 'Send notification to segment' })
  @ApiStandardResponse(Object)
  async sendToSegment(@Body() dto: SegmentNotificationDto): Promise<any> {
    return this.segmentService.sendToSegment(dto);
  }

  /**
   * Clears all notifications for a specific user.
   */
  @Delete('user/:userId')
  @ApiOperation({ summary: 'Clear notifications for a user' })
  @ApiStandardResponse(Object)
  async clearUserNotifications(@Param('userId') userId: string): Promise<any> {
    return this.adminService.clearUserNotifications(userId);
  }

  /**
   * Resends a specific notification.
   */
  @Post(':id/resend')
  @HttpCode(200)
  @ApiOperation({ summary: 'Resend a notification' })
  @ApiStandardResponse(Object)
  async resendNotification(@Param('id') id: string): Promise<any> {
    const notification = await this.prismaRead.notification.findUnique({ where: { id } });
    if (!notification) throw new Error('Notification not found');

    const outboxClient =
      (this.prismaWrite as any).outboxEvent || (this.prismaRead as any).outboxEvent;

    if (outboxClient) {
      await outboxClient.create({
        data: {
          aggregateType: 'NOTIFICATION',
          aggregateId: id,
          eventType: 'NOTIFICATION_RESEND_TRIGGERED',
          payload: { notificationId: id },
        },
      });
    }

    return { id, status: 'resent' };
  }
}
