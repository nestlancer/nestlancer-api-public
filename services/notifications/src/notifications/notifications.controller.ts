import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { QueryNotificationsDto } from '../dto/query-notifications.dto';
import { MarkReadDto } from '../dto/mark-read.dto';
import { MarkSelectedReadDto } from '../dto/mark-selected-read.dto';
import {
  ApiPaginated,
  ApiStandardResponse,
  ApiStandardResponses,
  AuthenticatedUser,
  CurrentUser,
} from '@nestlancer/common';
import { JwtAuthGuard } from '@nestlancer/auth-lib';

/**
 * Controller for user-facing notification operations.
 */
@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiStandardResponses()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Retrieves a paginated list of notifications for the authenticated user.
   *
   * @param user The metadata of the currently authenticated user
   * @param query Filtering and pagination parameters
   * @returns A promise resolving to a paginated set of user notifications
   */
  @Get()
  @ApiOperation({
    summary: 'Get current user notifications',
    description: 'Fetch all active and unread notifications belonging to your account.',
  })
  @ApiPaginated()
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotificationsDto,
  ): Promise<any> {
    return this.notificationsService.findByUser(user.userId, query);
  }

  /**
   * Retrieves the total count of unread notifications for the active user session.
   *
   * @param user The metadata of the currently authenticated user
   * @returns A promise resolving to the unread notification count
   */
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
    description: 'Retrieve the total number of notifications that have not yet been acknowledged.',
  })
  @ApiStandardResponse(Object)
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    return this.notificationsService.getUnreadCount(user.userId);
  }

  /**
   * Retrieves historical notifications for the current user.
   */
  @Get('history')
  @ApiOperation({ summary: 'Get notification history' })
  @ApiPaginated()
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotificationsDto,
  ): Promise<any> {
    return this.notificationsService.getHistory(user.userId, query);
  }

  /**
   * Retrieves a specific notification by ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single notification' })
  @ApiStandardResponse(Object)
  async getNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<any> {
    return this.notificationsService.findByIdAndUser(id, user.userId);
  }

  /**
   * Marks a specific notification as read.
   */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiStandardResponse(Object)
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MarkReadDto,
  ): Promise<any> {
    const read = dto.isRead ?? dto.read ?? true;
    return this.notificationsService.markRead(id, user.userId, read);
  }

  /**
   * Marks a specific notification as unread.
   */
  @Patch(':id/unread')
  @ApiOperation({ summary: 'Mark a notification as unread' })
  @ApiStandardResponse(Object)
  async markAsUnread(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<any> {
    return this.notificationsService.markRead(id, user.userId, false);
  }

  /**
   * Marks all user notifications as read.
   */
  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @HttpCode(200)
  @ApiStandardResponse(Object)
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    return this.notificationsService.markAllRead(user.userId);
  }

  /**
   * Marks selected notifications as read.
   */
  @Post('read-selected')
  @ApiOperation({ summary: 'Mark selected notifications as read' })
  @HttpCode(200)
  @ApiStandardResponse(Object)
  async markSelectedAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MarkSelectedReadDto,
  ): Promise<any> {
    return this.notificationsService.markSelectedRead(user.userId, dto.notificationIds);
  }

  /**
   * Clears all read notifications from the user's view.
   */
  @Delete('clear-read')
  @ApiOperation({ summary: 'Clear all read notifications' })
  @ApiStandardResponse(Object)
  async clearReadNotifications(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    return this.notificationsService.clearRead(user.userId);
  }

  /**
   * Soft-deletes a specific notification.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a notification' })
  @ApiStandardResponse(Object)
  async deleteNotification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<any> {
    return this.notificationsService.softDelete(id, user.userId);
  }
}
