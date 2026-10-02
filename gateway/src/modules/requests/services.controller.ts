import { Controller, Get, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { Public, ApiStandardResponses } from '@nestlancer/common';
import { HttpProxyService } from '../../proxy';

/**
 * Public service catalog — proxied to requests microservice.
 */
@Controller('services')
@ApiTags('services')
@ApiStandardResponses()
export class ServicesController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active service packages' })
  async list(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get service package by slug' })
  @ApiParam({ name: 'slug', description: 'Service package slug' })
  async getOne(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }
}
