import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiConsumes } from '@nestjs/swagger';

import { Request } from 'express';

import { Roles } from '@nestlancer/auth-lib';
import { Public, ApiStandardResponses, UserRole } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Requests Gateway Controller
 * Routes project request operations to the Requests Service.
 *
 * Requests service: prefix api/v1, @Controller('requests')
 * Available: health, list, create, details, update, submit, delete, stats,
 *            status-timeline, attachments CRUD, quotes
 */
@Controller('requests')
@ApiTags('requests')
@ApiBearerAuth()
@ApiStandardResponses()
export class RequestsController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Requests service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get()
  @ApiOperation({ summary: 'List project requests' })
  async findAll(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Post()
  @ApiOperation({ summary: 'Create a project request' })
  async create(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get request statistics' })
  async getStats(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get('capacity')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin capacity dashboard (legacy alias)' })
  async getCapacityDashboard(@Req() req: Request) {
    return this.proxy.forward('requests', req, undefined, '/api/v1/admin/requests/capacity/dashboard');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get request details' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  async findOne(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update request' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  async update(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete request' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  async remove(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit request for review' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  async submit(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get request status timeline' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  async getStatusTimeline(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get(':id/quotes')
  @ApiOperation({ summary: 'Get quotes for request' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  async getRequestQuotes(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  // --- Attachments ---

  @Get(':id/attachments')
  @ApiOperation({ summary: 'List request attachments' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  async getAttachments(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Post(':id/attachments')
  @ApiOperation({ summary: 'Add attachment to request' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiConsumes('multipart/form-data')
  async addAttachment(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Remove request attachment' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment UUID' })
  async removeAttachment(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get(':id/attachments/:attachmentId/download')
  @ApiOperation({ summary: 'Get presigned download URL for request attachment' })
  @ApiParam({ name: 'id', description: 'Request UUID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment UUID' })
  async getAttachmentDownloadUrl(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }
}
