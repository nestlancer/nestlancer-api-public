import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ConflictException,
} from '@nestjs/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { ProgressService } from '../../services/progress.service';
import { CreateProgressEntryDto } from '../../dto/create-progress-entry.dto';
import { UpdateProgressEntryDto } from '../../dto/update-progress-entry.dto';
import { QueryProgressDto } from '../../dto/query-progress.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import {
  ApiStandardResponse,
  ApiStandardResponses,
  assertValidTransition,
} from '@nestlancer/common';
import { ProgressEntryResponseDto } from '../../dto/progress-entry-response.dto';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { BusinessLogicException } from '@nestlancer/common';

/**
 * Controller for administrative management of project progress and timeline entries.
 */
@ApiTags('Admin/Progress')
@ApiBearerAuth()
@Auth('ADMIN')
@Controller('admin/progress')
@ApiStandardResponses()
export class ProgressAdminController {
  constructor(
    private readonly progressService: ProgressService,
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  /**
   * Creates a new progress entry for a project.
   */
  @Post('projects/:projectId')
  @ApiOperation({ summary: 'Create progress entry' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiStandardResponse({ type: ProgressEntryResponseDto })
  async createProgressEntry(
    @Param('projectId') projectId: string,
    @CurrentUser('userId') adminId: string,
    @Body() dto: CreateProgressEntryDto,
  ): Promise<any> {
    const entry = await this.progressService.createEntry(adminId, projectId, dto);
    return { status: 'success', data: entry };
  }

  /**
   * Lists all progress entries for a specific project.
   */
  @Get('projects/:projectId')
  @ApiOperation({ summary: 'List progress entries for project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiStandardResponse({ type: ProgressEntryResponseDto, isArray: true })
  async getProjectProgress(
    @Param('projectId') projectId: string,
    @Query() query: QueryProgressDto,
  ): Promise<any> {
    const data = await this.progressService.getProjectProgress(projectId, query);
    return { status: 'success', ...data };
  }

  /**
   * Updates an existing progress entry.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update progress entry' })
  @ApiParam({ name: 'id', description: 'Progress entry UUID' })
  @ApiStandardResponse({ type: ProgressEntryResponseDto })
  async updateProgressEntry(
    @Param('id') id: string,
    @Body() dto: UpdateProgressEntryDto,
  ): Promise<any> {
    const data = await this.progressService.updateEntry(id, dto);
    return { status: 'success', data };
  }

  /**
   * Deletes a progress entry.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete progress entry' })
  @ApiParam({ name: 'id', description: 'Progress entry UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Entry deleted successfully' })
  async deleteProgressEntry(@Param('id') id: string): Promise<any> {
    await this.progressService.deleteEntry(id);
    return { status: 'success' };
  }

  /**
   * Gets analytics data for project progress.
   */
  @Get('projects/:projectId/analytics')
  @ApiOperation({ summary: 'Get progress analytics for project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  async getAnalytics(@Param('projectId') projectId: string): Promise<any> {
    const [byType, byMilestoneRaw, totalCount] = await Promise.all([
      this.prismaRead.progressEntry.groupBy({
        by: ['type'],
        where: { projectId },
        _count: { _all: true },
      }),
      this.prismaRead.progressEntry.groupBy({
        by: ['milestoneId'],
        where: { projectId, milestoneId: { not: null } },
        _count: { _all: true },
      }),
      this.prismaRead.progressEntry.count({
        where: { projectId },
      }),
    ]);

    // NL-UI-006: map milestone UUIDs → titles for Activity breakdown.
    const milestoneIds = byMilestoneRaw
      .map((row) => row.milestoneId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
    const milestones =
      milestoneIds.length > 0
        ? await this.prismaRead.milestone.findMany({
            where: { id: { in: milestoneIds }, projectId },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(milestones.map((m) => [m.id, m.name]));
    const byMilestone = byMilestoneRaw.map((row) => ({
      milestoneId: row.milestoneId,
      milestoneName: row.milestoneId ? (nameById.get(row.milestoneId) ?? null) : null,
      count: row._count._all,
      _count: row._count,
    }));

    return { status: 'success', projectId, analytics: { byType, byMilestone, totalCount } };
  }

  /**
   * Gets the full administrative timeline for a project.
   */
  @Get('projects/:projectId/timeline')
  @ApiOperation({ summary: 'Get full administrative timeline for project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Timeline retrieved' })
  async getAdminTimeline(@Param('projectId') projectId: string): Promise<any> {
    const timeline = await this.prismaRead.progressEntry.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      include: { milestone: true, deliverable: true },
    });
    return { status: 'success', projectId, timeline };
  }

  /**
   * Modifies the operational status of a specific project.
   *
   * @param projectId Unique identifier of the project
   * @param body Payload containing the target project status
   * @returns A promise resolving to the updated project status metadata
   */
  @Patch('projects/:projectId/status')
  @ApiOperation({
    summary: 'Update project status (admin)',
    description:
      'Override and update the current lifecycle status of a project. Deprecated — prefer PATCH /admin/projects/:id/status on the projects service.',
    deprecated: true,
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project status successfully updated' })
  async updateProjectStatus(
    @Param('projectId') projectId: string,
    @Body() body: { status: string; reason?: string },
  ): Promise<any> {
    const project = await this.prismaRead.project.findUnique({ where: { id: projectId } });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    const raw = String(body.status ?? '').trim();
    if (!raw) throw new BusinessLogicException('status is required', 'VALIDATION_ERROR');
    const newStatus = raw.includes('_')
      ? raw.toUpperCase()
      : raw
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .replace(/([A-Z])/g, '_$1')
          .toUpperCase()
          .replace(/^_/, '');

    if (newStatus === project.status) {
      throw new ConflictException(`Project is already ${project.status}`);
    }
    assertValidTransition('PROJECT', project.status as string, newStatus);

    const updated = await this.prismaWrite.project.update({
      where: { id: projectId },
      data: { status: newStatus as any },
    });

    await this.prismaWrite.outbox.create({
      data: {
        type: 'PROJECT_STATUS_CHANGED',
        aggregateType: 'PROJECT',
        aggregateId: projectId,
        payload: {
          projectId,
          previousStatus: project.status,
          newStatus,
          status: newStatus,
          reason: body.reason ?? 'Admin status update',
        },
      },
    });

    return {
      status: 'success',
      data: {
        projectId,
        previousStatus: project.status,
        newStatus: updated.status,
        updatedAt: updated.updatedAt,
      },
    };
  }

  /**
   * Officially marks a project as transitioned to the COMPLETED state.
   *
   * @param projectId Unique identifier of the project
   * @param body Optional completion metadata
   * @returns A promise resolving to the final completion status of the project
   */
  @Post('projects/:projectId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark project as complete (admin)',
    description: 'Finalize a project and record its completion details in the system.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project successfully marked as complete' })
  async markProjectComplete(
    @Param('projectId') projectId: string,
    @Body() _body: any,
  ): Promise<any> {
    const project = await this.prismaRead.project.findUnique({ where: { id: projectId } });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');
    if (project.status === 'COMPLETED') {
      throw new BusinessLogicException('Project already completed', 'PROJECT_005');
    }
    // Same machine as PATCH status — do not jump IN_PROGRESS → COMPLETED.
    assertValidTransition('PROJECT', project.status as string, 'COMPLETED');

    const completedAt = new Date();
    const updated = await this.prismaWrite.project.update({
      where: { id: projectId },
      data: {
        status: 'COMPLETED',
        completedAt,
        overallProgress: 100,
      },
    });

    await this.prismaWrite.outbox.create({
      data: {
        type: 'PROJECT_COMPLETED',
        aggregateType: 'PROJECT',
        aggregateId: projectId,
        payload: {
          projectId,
          previousStatus: project.status,
          newStatus: 'COMPLETED',
          status: 'COMPLETED',
          completedAt: completedAt.toISOString(),
        },
      },
    });

    return {
      status: 'success',
      data: {
        projectId,
        status: updated.status,
        completedAt: updated.completedAt,
      },
    };
  }
}
