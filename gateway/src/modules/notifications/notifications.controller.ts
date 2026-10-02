import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiStandardResponses, Public } from '@nestlancer/common';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { Request } from 'express';

import { HttpProxyService } from '../../proxy';

/**
 * Notifications Gateway Controller
 * Routes notification requests to the Notifications Service.
 *
 * Notifications service: prefix api/v1, @Controller('notifications')
 * User-facing: list, unread-count, history, read/unread, read-all, read-selected, clear-read, delete
 */
@Controller('notifications')
@ApiTags('notifications')
@ApiBearerAuth()
@ApiStandardResponses()
export class NotificationsController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications' })
  async findAll(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get notification history' })
  async getHistory(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Get('channels')
  @ApiOperation({ summary: 'Get available notification channels' })
  async getChannels(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Get('preferences/channels')
  @ApiOperation({ summary: 'Get delivery channels (alias)' })
  async getPreferencesChannels(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Patch('preferences/channel/:channel')
  @ApiOperation({ summary: 'Update specific channel preference' })
  @ApiParam({ name: 'channel', description: 'Channel key (e.g. email, push, inApp)' })
  async updateChannelPreference(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Notifications service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('notifications', req, undefined, '/api/v1/health');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get notification by ID' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  async findOne(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  async markAsRead(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Patch(':id/unread')
  @ApiOperation({ summary: 'Mark notification as unread' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  async markAsUnread(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Post('read-selected')
  @ApiOperation({ summary: 'Mark selected notifications as read' })
  async markSelectedAsRead(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Delete('clear-read')
  @ApiOperation({ summary: 'Clear all read notifications' })
  async clearReadNotifications(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  async remove(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }
}
