import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { Request } from 'express';

import { Public, ApiStandardResponses } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Quotes Gateway Controller
 * Routes quote requests to the Quotes Service.
 *
 * Quotes service: prefix api/v1, @Controller('quotes')
 * User-facing: list, details, accept, decline, request-changes, pdf, stats
 */
@Controller('quotes')
@ApiTags('quotes')
@ApiBearerAuth()
@ApiStandardResponses()
export class QuotesController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Get()
  @ApiOperation({ summary: 'List quotes' })
  async findAll(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user quote statistics' })
  async getStats(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Quotes service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quote details' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async findOne(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept quote' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async accept(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline quote' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async decline(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Post(':id/request-changes')
  @ApiOperation({ summary: 'Request changes to quote' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async requestChanges(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get(':id/documents/versions')
  @ApiOperation({ summary: 'List quote document versions' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async listDocumentVersions(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get(':id/contract/preview')
  @ApiOperation({ summary: 'Preview draft service agreement PDF before acceptance' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async previewContract(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get(':id/contract')
  @ApiOperation({ summary: 'Download signed contract PDF' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async downloadContract(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download quote PDF (presigned cloud URL)' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async downloadPdf(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }
}
