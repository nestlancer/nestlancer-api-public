import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { Request } from 'express';

import { ApiStandardResponses, Public } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Progress Gateway Controller
 * Routes progress requests to the Progress Service.
 *
 * Progress is project-scoped: all routes are under /projects/:projectId/progress/...
 * The progress service has @Controller('projects/:projectId/progress') with prefix api + URI v1.
 */
@Controller('progress')
@ApiTags('progress')
@ApiBearerAuth()
@ApiStandardResponses()
export class ProgressController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Progress service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, '/api/v1/progress/health');
  }

  // --- Project Progress Timeline ---

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'Get progress timeline for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getTimeline(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }

  @Post('projects/:projectId')
  @ApiOperation({ summary: 'Create a progress entry for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async createEntry(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }

  @Get('projects/:projectId/status')
  @ApiOperation({ summary: 'Get overall project status summary' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getStatusSummary(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }

  @Get('projects/:projectId/milestones')
  @ApiOperation({ summary: 'Get milestone progress for project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getMilestoneProgress(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }

  @Post('projects/:projectId/request-changes')
  @ApiOperation({ summary: 'Request revisions on project progress' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async requestChanges(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }

  @Get('projects/:projectId/:entryId')
  @ApiOperation({ summary: 'Get single progress entry' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiParam({ name: 'entryId', description: 'Progress entry UUID' })
  async getEntry(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }

  // --- Milestones (user) ---

  @Post('milestones/:id/approve')
  @ApiOperation({ summary: 'Approve a milestone (client)' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  async approveMilestone(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }

  @Post('milestones/:id/request-revision')
  @ApiOperation({ summary: 'Request revision on a milestone (client)' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  async requestMilestoneRevision(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }

  // --- Deliverables (user reviews) ---

  @Post('deliverables/:id/approve')
  @ApiOperation({ summary: 'Approve a deliverable (client)' })
  @ApiParam({ name: 'id', description: 'Deliverable UUID' })
  async approveDeliverable(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }

  @Post('deliverables/:id/reject')
  @ApiOperation({ summary: 'Reject a deliverable (client)' })
  @ApiParam({ name: 'id', description: 'Deliverable UUID' })
  async rejectDeliverable(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }
}
