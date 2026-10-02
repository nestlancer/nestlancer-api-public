import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { Request } from 'express';

import { ApiStandardResponses, Public, Roles, UserRole } from '@nestlancer/common';
import { Permissions } from '@nestlancer/auth-lib';

import { HttpProxyService } from '../../proxy';

/**
 * Contact Gateway Controller
 * Routes contact requests to the Contact Service
 */
@Controller('contact')
@ApiTags('contact')
@ApiStandardResponses()
export class ContactController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Submit contact form (documented path)' })
  async submitContactForm(@Req() req: Request) {
    return this.proxy.forward('contact', req);
  }

  @Post('inquiries')
  @Public()
  @ApiOperation({ summary: 'Submit contact inquiry (alias of POST /contact)' })
  async submitInquiry(@Req() req: Request) {
    return this.proxy.forward('contact', req, undefined, '/api/v1/contact');
  }

  @Get('inquiries')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Permissions('contact:manage')
  @ApiOperation({ summary: 'List contact inquiries (Admin only)' })
  async findAll(@Req() req: Request) {
    return this.proxy.forward('contact', req, undefined, '/api/v1/admin/contact');
  }

  @Get('inquiries/:id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get inquiry by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('contact', req, undefined, `/api/v1/admin/contact/${id}`);
  }

  @Patch('inquiries/:id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update inquiry status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async update(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('contact', req, undefined, `/api/v1/admin/contact/${id}/status`);
  }

  @Delete('inquiries/:id')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete inquiry (Admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('contact', req, undefined, `/api/v1/admin/contact/${id}`);
  }

  @Post('inquiries/:id/respond')
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Respond to inquiry (Admin only)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async respond(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward('contact', req, undefined, `/api/v1/admin/contact/${id}/respond`);
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Contact service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('contact', req);
  }
}
