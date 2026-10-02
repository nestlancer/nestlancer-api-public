import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { Request } from 'express';

import { Public, ApiStandardResponses } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

@Controller('share')
@ApiTags('media-share')
@ApiStandardResponses()
export class ShareGatewayController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Resolve public media share link (no password in URL)' })
  @ApiParam({ name: 'token', description: 'Share token' })
  async resolveShare(@Req() req: Request, @Param('token') _token: string) {
    return this.proxy.forward('media', req);
  }

  @Public()
  @Post(':token')
  @ApiOperation({ summary: 'Resolve password-protected public media share link' })
  @ApiParam({ name: 'token', description: 'Share token' })
  async resolveShareWithPassword(@Req() req: Request, @Param('token') _token: string) {
    return this.proxy.forward('media', req);
  }
}
