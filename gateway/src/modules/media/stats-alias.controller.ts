import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Request } from 'express';

import { ApiStandardResponses } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Root-level media stats alias documented in OpenAPI as GET /api/v1/stats.
 * Media service exposes this via MediaRootController (@Controller() + @Get('stats')).
 */
@ApiTags('stats')
@ApiBearerAuth()
@Controller('stats')
@ApiStandardResponses()
export class StatsAliasController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Get()
  @ApiOperation({ summary: 'Get root storage stats (media)' })
  async getStats(@Req() req: Request) {
    return this.proxy.forward('media', req, undefined, '/api/v1/stats');
  }
}
