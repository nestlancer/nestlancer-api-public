import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Request } from 'express';

import { ApiStandardResponses } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Legacy top-level conversation aliases.
 * Canonical routes live under /api/v1/messages/conversations*; OpenAPI still
 * documents /api/v1/conversations for older clients.
 */
@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
@ApiStandardResponses()
export class ConversationsAliasController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Get()
  @ApiOperation({ summary: 'List user conversations (legacy alias)' })
  async list(@Req() req: Request) {
    return this.proxy.forward('messaging', req, undefined, '/api/v1/conversations');
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread conversation count (legacy alias)' })
  async unreadCount(@Req() req: Request, @Query() _query: Record<string, unknown>) {
    return this.proxy.forward('messaging', req, undefined, '/api/v1/conversations/unread-count');
  }
}
