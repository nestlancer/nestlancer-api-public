import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { Request } from 'express';

import { ApiStandardResponses, Public } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Projects Gateway Controller
 * Routes project requests to the Projects Service.
 *
 * Projects service: prefix api/v1, @Controller('projects')
 * Available: health, stats, templates, list, details, timeline, deliverables,
 *            payments, progress, milestones, messages, approve, sign-contract, revision, feedback
 */
@Controller('projects')
@ApiTags('projects')
@ApiBearerAuth()
@ApiStandardResponses()
export class ProjectsController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Projects service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get project statistics' })
  async getStats(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get()
  @ApiOperation({ summary: 'List projects' })
  async findAll(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get('by-quote/:quoteId')
  @ApiOperation({ summary: 'Get project by quote ID (post-accept polling)' })
  @ApiParam({ name: 'quoteId', description: 'Quote UUID' })
  async findByQuoteId(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  /**
   * Public discovery routes live on the projects service as /api/v1/public (not under /projects).
   * Register these before @Get(':id') so "public" is not captured as a project id.
   */
  @Public()
  @Get('public')
  @ApiOperation({ summary: 'List public projects (portfolio discovery)' })
  async listPublicProjects(@Req() req: Request) {
    return this.proxy.forward('projects', req, undefined, '/api/v1/public');
  }

  @Public()
  @Get('public/:publicId')
  @ApiOperation({ summary: 'Get public project details by id or slug' })
  @ApiParam({ name: 'publicId', description: 'Portfolio item UUID or slug' })
  async getPublicProjectDetails(@Req() req: Request) {
    const id = encodeURIComponent(req.params['publicId'] ?? '');
    return this.proxy.forward('projects', req, undefined, `/api/v1/public/${id}`);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async findOne(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get project timeline' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async getTimeline(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get(':id/deliverables')
  @ApiOperation({ summary: 'Get project deliverables' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async getDeliverables(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get(':id/payments')
  @ApiOperation({ summary: 'Get project payments' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async getPayments(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get(':id/progress')
  @ApiOperation({ summary: 'Get project progress summary' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async getProgress(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get(':id/milestones')
  @ApiOperation({ summary: 'Get project milestones' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async getMilestones(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get project messages' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async getMessages(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send project message' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async sendMessage(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async approveProject(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post(':id/sign-contract')
  @ApiOperation({ summary: 'Sign project contract before deposit' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async signContract(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post(':id/request-revision')
  @ApiOperation({ summary: 'Request project revision' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async requestRevision(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Submit project feedback' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async submitFeedback(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get(':id/feedback')
  @ApiOperation({ summary: 'Get project feedback' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async getFeedback(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }
}
