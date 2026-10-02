// import { } from '@nestjs/common';
import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { ProgressTimelineService } from '../../services/progress-timeline.service';
import { ProgressService } from '../../services/progress.service';
import { QueryProgressDto } from '../../dto/query-progress.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ApiStandardResponse, ApiStandardResponses } from '@nestlancer/common';
import { ProgressEntryResponseDto } from '../../dto/progress-entry-response.dto';
import { CreateProgressEntryDto } from '../../dto/create-progress-entry.dto';
import { RequestChangesDto } from '../../dto/request-changes.dto';

/**
 * Controller for managing and viewing project progress from a user's perspective.
 */
@ApiTags('Progress')
@ApiBearerAuth()
@Auth()
@Controller('projects/:projectId/progress')
@ApiParam({ name: 'projectId', description: 'Unique identifier of the project' })
@ApiStandardResponses()
export class ProgressController {
  constructor(
    private readonly timelineService: ProgressTimelineService,
    private readonly progressService: ProgressService,
  ) {}

  /**
   * Retrieves the historical timeline of progress updates for a specific project.
   */
  @Get()
  @ApiOperation({ summary: 'Get progress timeline for project' })
  @ApiStandardResponse({ type: ProgressEntryResponseDto, isArray: true })
  async getTimeline(
    @Param('projectId') projectId: string,
    @CurrentUser('userId') userId: string,
    @Query() query: QueryProgressDto,
  ): Promise<any> {
    await this.progressService.assertClientProjectAccess(userId, projectId);
    const data = await this.timelineService.getTimeline(projectId, query);
    return { status: 'success', data, ...data };
  }

  /**
   * Retrieves a high-level operational summary of project progress.
   * Includes aggregated metrics such as overall completion percentage and current phase.
   *
   * @param projectId Unique identifier of the project
   * @returns A promise resolving to a project status summary object
   */
  @Get('status')
  @ApiOperation({
    summary: 'Get overall project status summary',
    description: "Fetch a concise overview of the project's current health and advancement.",
  })
  @ApiResponse({ status: 200, description: 'Project status summary successfully retrieved' })
  async getStatusSummary(
    @Param('projectId') projectId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<any> {
    await this.progressService.assertClientProjectAccess(userId, projectId);
    const data = await this.progressService.getStatusSummary(projectId);
    return { status: 'success', data };
  }

  /**
   * Retrieves specific progress metrics for all project milestones.
   *
   * @param projectId Unique identifier of the project
   * @returns A promise resolving to a collection of milestone progress data
   */
  @Get('milestones')
  @ApiOperation({
    summary: 'Get milestone progress for project',
    description: 'Retrieve tracking information for all major project milestones.',
  })
  @ApiResponse({ status: 200, description: 'Milestone progress data successfully retrieved' })
  async getMilestoneProgress(
    @Param('projectId') projectId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<any> {
    await this.progressService.assertClientProjectAccess(userId, projectId);
    const milestones = await this.progressService.getMilestoneProgress(projectId);
    return { status: 'success', data: { projectId, milestones } };
  }

  /**
   * Registers a request for revisions or changes based on recent progress updates.
   * Typically initiated by the client upon reviewing a deliverable or status update.
   *
   * @param projectId Unique identifier of the project
   * @param userId Authenticated identifier of the user making the request
   * @param dto Motivation and details for the requested changes
   * @returns A promise revolving to the created change request details
   */
  @Post('request-changes')
  @ApiOperation({
    summary: 'Request revisions on project progress',
    description: 'Submit a formal request for modifications to current project outputs.',
  })
  @ApiResponse({ status: 201, description: 'Revision request successfully submitted' })
  async requestChanges(
    @Param('projectId') projectId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: RequestChangesDto,
  ): Promise<any> {
    await this.progressService.assertClientProjectAccess(userId, projectId);
    // Persist as a STATUS_CHANGE progress entry visible to both parties.
    // NL-UI-013: never echo reason into bullet details.
    const reason = dto.reason.trim();
    const detailText = (dto.details ?? [])
      .map((d) => d.description?.trim())
      .filter((text): text is string => Boolean(text) && text !== reason)
      .map((text) => `• ${text}`)
      .join('\n');

    const entry = await this.progressService.createEntry(userId, projectId, {
      type: 'STATUS_CHANGE' as any,
      title: 'Revision Requested',
      description: reason + (detailText ? `\n\n${detailText}` : ''),
      notifyClient: false,
      visibility: 'CLIENT_VISIBLE' as any,
    });

    return {
      status: 'success',
      data: { projectId, requestId: entry.id, reason: dto.reason },
    };
  }

  /**
   * Retrieves details for a specific progress entry.
   */
  @Get(':entryId')
  @ApiOperation({ summary: 'Get single progress entry' })
  @ApiParam({ name: 'entryId', description: 'Progress entry UUID' })
  @ApiStandardResponse({ type: ProgressEntryResponseDto })
  async getEntry(
    @Param('projectId') projectId: string,
    @Param('entryId') entryId: string,
    @CurrentUser('userId') userId: string,
  ): Promise<any> {
    const data = await this.progressService.getClientEntry(userId, projectId, entryId);
    return { status: 'success', data };
  }

  /**
   * Manually creates a progress entry (admin-only; clients use request-changes).
   */
  @Post()
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Create a progress entry for a project (admin only)' })
  @ApiStandardResponse({ type: ProgressEntryResponseDto })
  async createProgressEntry(
    @Param('projectId') projectId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateProgressEntryDto,
  ): Promise<any> {
    const entry = await this.progressService.createEntry(userId, projectId, dto);
    return { status: 'success', projectId, entry };
  }
}
