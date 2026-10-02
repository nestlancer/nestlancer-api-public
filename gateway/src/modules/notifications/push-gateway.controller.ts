import { Controller, Post, Delete, Param, Req } from '@nestjs/common';
import { ApiStandardResponses } from '@nestlancer/common';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { Request } from 'express';

import { HttpProxyService } from '../../proxy';

/**
 * Proxies Web Push device registration to the notifications service
 * (/api/v1/push/*).
 */
@Controller('push')
@ApiTags('push')
@ApiBearerAuth()
@ApiStandardResponses()
export class PushGatewayController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register push device token' })
  async register(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Delete('unregister/:deviceId')
  @ApiOperation({ summary: 'Unregister push device' })
  @ApiParam({ name: 'deviceId', description: 'Client device identifier' })
  async unregister(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }
}
