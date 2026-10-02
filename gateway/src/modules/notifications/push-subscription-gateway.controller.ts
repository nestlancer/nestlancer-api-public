import { Controller, Post, Delete, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiStandardResponses } from '@nestlancer/common';
import { Request } from 'express';

import { HttpProxyService } from '../../proxy';

/**
 * Proxies Web Push subscription management to the notifications service
 * (/api/v1/push-subscription).
 */
@Controller('push-subscription')
@ApiTags('push-subscription')
@ApiBearerAuth()
@ApiStandardResponses()
export class PushSubscriptionGatewayController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Post()
  @ApiOperation({ summary: 'Register web push subscription' })
  async register(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Delete()
  @ApiOperation({ summary: 'Remove web push subscription' })
  async remove(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }
}
