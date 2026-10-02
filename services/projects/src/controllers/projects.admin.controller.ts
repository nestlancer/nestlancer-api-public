import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import { DocumentType } from '@prisma/client';
import { DocumentGenerationService } from '@nestlancer/documents';
import { ApiStandardResponse, ApiStandardResponses, UserRole, clampPagination } from '@nestlancer/common';
import { ActiveUser, JwtAuthGuard, RolesGuard, Roles } from '@nestlancer/auth-lib';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { ProjectsAdminService } from '../services/projects.admin.service';
import { ProjectDuplicationService } from '../services/project-duplication.service';
import { UpdateProjectStatusAdminDto } from '../dto/update-project-status.admin.dto';
import { UpdateProjectAdminDto } from '../dto/update-project.admin.dto';
import { CreateProjectAdminDto } from '../dto/create-project.admin.dto';
import { ManageProjectTeamAdminDto } from '../dto/manage-project-team.admin.dto';
import { CreateMilestonesAdminDto } from '../dto/create-milestones.admin.dto';
import { ExtendProjectAdminDto } from '../dto/extend-project.admin.dto';
import { DuplicateFromTemplateDto } from '../dto/duplicate-from-template.dto';
import { CreatePortfolioDraftFromProjectDto } from '../dto/create-portfolio-draft-from-project.dto';
import { ProjectPortfolioBridgeService } from '../services/project-portfolio-bridge.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * Controller for administrative management of all projects in the system.
 */
@ApiTags('Admin/Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/projects')
@ApiStandardResponses()
export class ProjectsAdminController {
  constructor(
    private readonly adminService: ProjectsAdminService,
    private readonly projectDuplication: ProjectDuplicationService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly documentGen: DocumentGenerationService,
    private readonly portfolioBridge: ProjectPortfolioBridgeService,
  ) {}

  /**
   * Retrieves a comprehensive registry of all projects within the platform.
   * Supports administrative pagination for high-volume project management.
   *
   * @param page Current target page index
   * @param limit Maximum amount of records per response
   * @returns A promise resolving to a paginated collection of all projects
   */
  @Get()
  @ApiOperation({
    summary: 'List all projects (Admin)',
    description: 'Access the global repository of project records for oversight and audit.',
  })
  @ApiQuery({ name: 'page', required: false, example: '1', description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: '20', description: 'Results per page' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by title or client' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (camelCase or enum)',
  })
  @ApiQuery({ name: 'clientId', required: false, description: 'Filter by client user ID' })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: 'Alias for clientId — filter by client user ID',
  })
  @ApiStandardResponse()
  async listProjects(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('userId') userId?: string,
  ): Promise<any> {
    const { page: pageNum, limit: limitNum } = clampPagination(page, limit);
    return this.adminService.listProjects(
      pageNum,
      limitNum,
      search,
      status,
      clientId ?? userId,
    );
  }

  /**
   * Retrieves aggregated system-wide project analytics and KPIs.
   * Includes health metrics across the entire platform lifecycle.
   *
   * @returns A promise resolving to global project health statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get global project statistics',
    description: 'Fetch high-level performance data and status distribution for all projects.',
  })
  @ApiStandardResponse()
  async getProjectStats(): Promise<any> {
    return this.adminService.getProjectStats();
  }

  /**
   * Executes an administrative override on the lifecycle status of a specific project.
   *
   * @param id Unique identifier of the target project
   * @param adminId Identifier of the authorized administrator performing the action
   * @param dto New status configuration and justification
   * @returns A promise confirming successful status modification
   */
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Override project status',
    description: "Perform an administrative intervention to change a project's current state.",
  })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Project status updated successfully' })
  async updateProjectStatus(
    @Param('id') id: string,
    @ActiveUser('sub') adminId: string,
    @Body() dto: UpdateProjectStatusAdminDto,
  ): Promise<any> {
    return this.adminService.updateProjectStatus(id, adminId, dto);
  }

  @Get(':id/status-history')
  @ApiOperation({ summary: 'List project status change history' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getProjectStatusHistory(@Param('id') id: string): Promise<any> {
    return this.adminService.getStatusHistory(id);
  }

  /**
   * Updates core details of an existing project.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update project details (Admin)' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Project updated successfully' })
  async updateProject(@Param('id') id: string, @Body() dto: UpdateProjectAdminDto): Promise<any> {
    return this.adminService.updateProject(id, dto);
  }

  /**
   * Returns a sanitized template snapshot for the duplicate-as-template wizard.
   */
  @Get(':id/duplicate-preview')
  @ApiOperation({ summary: 'Preview project as duplicate template' })
  @ApiParam({ name: 'id', description: 'Source project UUID' })
  @ApiStandardResponse()
  async getDuplicatePreview(@Param('id') id: string): Promise<any> {
    return this.projectDuplication.buildTemplateSnapshot(id);
  }

  /**
   * Retrieves full administrative details for a specific project.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get project administrative details' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getProjectDetails(@Param('id') id: string): Promise<any> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundException('Project not found');
    }
    const project = await this.prismaRead.project.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, firstName: true, lastName: true, email: true } },
        admin: { select: { id: true, firstName: true, lastName: true, email: true } },
        milestones: true,
        payments: true,
        progressEntries: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /**
   * Manually creates a new project record.
   */
  @Post()
  @ApiOperation({ summary: 'Create project (Admin)' })
  @ApiStandardResponse({ message: 'Project created successfully' })
  async createProject(
    @ActiveUser('sub') adminId: string,
    @Body() dto: CreateProjectAdminDto,
  ): Promise<any> {
    return this.prismaWrite.project.create({
      data: {
        title: dto.title,
        description: dto.description ?? '',
        status: 'CREATED',
        quote: { connect: { id: dto.quoteId } },
        client: { connect: { id: dto.clientId } },
        admin: { connect: { id: adminId } },
        targetEndDate: dto.targetEndDate ? new Date(dto.targetEndDate) : null,
      },
    });
  }

  /**
   * Creates Request + Quote (DRAFT) from an edited project template.
   * Project is created only after the client accepts the quote.
   */
  @Post('from-template')
  @ApiOperation({ summary: 'Create draft quote from project template' })
  @ApiStandardResponse({ message: 'Draft quote created from template' })
  @HttpCode(HttpStatus.CREATED)
  async createFromTemplate(
    @ActiveUser('sub') adminId: string,
    @Body() dto: DuplicateFromTemplateDto,
  ): Promise<any> {
    const result = await this.projectDuplication.createFromTemplate(adminId, dto);
    return {
      ...result,
      message: 'Draft quote created. Send it to the client when ready.',
    };
  }

  /**
   * Permanent removal of a project record.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: 204, description: 'Project deleted' })
  async deleteProject(@Param('id') id: string): Promise<any> {
    await this.prismaWrite.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  /**
   * Adds a new team member to a project.
   */
  @Post(':id/team')
  @ApiOperation({ summary: 'Manage project team' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Team member added' })
  async manageTeam(@Param('id') id: string, @Body() dto: ManageProjectTeamAdminDto): Promise<any> {
    await this.prismaWrite.project.update({
      where: { id },
      data: { adminId: dto.memberId },
    });
    return { projectId: id, action: 'added', memberId: dto.memberId };
  }

  /**
   * Removes a team member from a project.
   */
  @Delete(':id/team/:memberId')
  @ApiOperation({ summary: 'Remove team member' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiParam({ name: 'memberId', description: 'Team member UUID' })
  @ApiStandardResponse({ message: 'Team member removed' })
  async removeTeamMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ): Promise<any> {
    await this.prismaWrite.project.update({
      where: { id },
      data: { adminId: null },
    });
    return { projectId: id, memberId, removed: true };
  }

  /**
   * Retrieves in-depth performance analytics for a specific project.
   */
  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get project analytics' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getAnalytics(@Param('id') id: string): Promise<any> {
    const [milestones, payments, project] = await Promise.all([
      this.prismaRead.milestone.findMany({ where: { projectId: id } }),
      this.prismaRead.payment.findMany({ where: { projectId: id } }),
      this.prismaRead.project.findUnique({ where: { id }, select: { overallProgress: true } }),
    ]);

    // Align with client hub: approved delivery milestones count as completed.
    // COMPLETED/REVIEW remain in-flight until the client approves → APPROVED.
    const completedMilestoneStatuses = new Set(['APPROVED']);
    const completedMilestones = milestones.filter((m) =>
      completedMilestoneStatuses.has(String(m.status)),
    ).length;
    const budgetSpent = payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      projectId: id,
      progress: project?.overallProgress || 0,
      milestonesCompleted: completedMilestones,
      totalMilestones: milestones.length,
      budget: { spent: budgetSpent },
    };
  }

  /**
   * Group creation of milestones for a project.
   */
  @Post(':id/milestones')
  @ApiOperation({ summary: 'Batch create milestones' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Milestones created' })
  async createMilestones(
    @Param('id') id: string,
    @Body() dto: CreateMilestonesAdminDto,
  ): Promise<any> {
    const existing = await this.prismaRead.milestone.findMany({
      where: { projectId: id },
      select: { name: true, order: true, amount: true },
    });
    const existingNames = new Set(
      existing.map((m) => (m.name ?? '').trim().toLowerCase()).filter(Boolean),
    );

    // NL-DATA-002: skip names that already exist on this project (idempotent reseed/admin retries).
    const toCreate = dto.milestones.filter((m) => {
      const key = (m.name ?? '').trim().toLowerCase();
      return key && !existingNames.has(key);
    });

    if (toCreate.length === 0) {
      return { projectId: id, created: 0, skipped: dto.milestones.length };
    }

    // NL-BUG-PAY-002: when payment-schedule rows already exist, new rows are delivery/work
    // milestones and must not carry a second copy of the contract value.
    const paymentRows = await this.prismaRead.payment.count({ where: { projectId: id } });
    const hasBillableSchedule =
      paymentRows > 0 || existing.some((m) => (m.amount ?? 0) > 0);

    // NL-BUG-MS-001: keep `order` unique per project (continue after the highest existing order).
    let nextOrder =
      existing.reduce((max, m) => Math.max(max, typeof m.order === 'number' ? m.order : 0), 0) + 1;

    const milestones = await this.prismaWrite.milestone.createMany({
      data: toCreate.map((m) => {
        const order = nextOrder++;
        return {
          projectId: id,
          name: m.name,
          description: m.description,
          amount: hasBillableSchedule ? 0 : Math.max(0, Math.round(Number(m.amount) || 0)),
          ...(hasBillableSchedule ? { percentage: 0 } : {}),
          dueDate: m.dueDate ? new Date(m.dueDate) : null,
          order,
        };
      }),
    });
    return {
      projectId: id,
      created: milestones.count,
      skipped: dto.milestones.length - toCreate.length,
    };
  }

  /**
   * Extends the formal deadline of a project.
   */
  @Post(':id/extend')
  @ApiOperation({ summary: 'Extend project deadline' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Deadline extended' })
  async extendDeadline(@Param('id') id: string, @Body() dto: ExtendProjectAdminDto): Promise<any> {
    await this.prismaWrite.project.update({
      where: { id },
      data: { targetEndDate: new Date(dto.newDeadline) },
    });

    const project = await this.prismaRead.project.findUnique({
      where: { id },
      select: { clientId: true, title: true },
    });

    await this.prismaWrite.outbox.create({
      data: {
        type: 'PROJECT_DEADLINE_EXTENDED',
        aggregateType: 'PROJECT',
        aggregateId: id,
        payload: {
          projectId: id,
          clientId: project?.clientId,
          userId: project?.clientId,
          projectTitle: project?.title,
          newDeadline: dto.newDeadline,
          reason: dto.reason,
        },
      },
    });

    return { projectId: id, newDeadline: dto.newDeadline, extended: true };
  }

  /**
   * Moves a project to the archives.
   */
  @Post(':id/archive')
  @ApiOperation({ summary: 'Archive project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Project archived' })
  async archiveProject(@Param('id') id: string): Promise<any> {
    return this.adminService.archiveProject(id);
  }

  /**
   * Restores a previously archived project.
   */
  @Post(':id/unarchive')
  @ApiOperation({ summary: 'Unarchive project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Project unarchived' })
  @HttpCode(HttpStatus.OK)
  async unarchiveProject(@Param('id') id: string): Promise<any> {
    return this.adminService.unarchiveProject(id);
  }

  /**
   * @deprecated Use GET duplicate-preview + POST from-template via the admin wizard.
   */
  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate project (deprecated — use from-template wizard)' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @HttpCode(HttpStatus.GONE)
  async duplicateProject(): Promise<any> {
    throw new GoneException(
      'One-click duplicate is deprecated. Use GET /admin/projects/:id/duplicate-preview and POST /admin/projects/from-template.',
    );
  }

  @Get(':id/portfolio-link')
  @ApiOperation({ summary: 'Get linked portfolio item status for a project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getProjectPortfolioLink(@Param('id') id: string) {
    return this.portfolioBridge.getPortfolioLink(id);
  }

  @Get(':id/portfolio-preview')
  @ApiOperation({ summary: 'Preview portfolio draft snapshot from a completed project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getProjectPortfolioPreview(@Param('id') id: string) {
    return this.portfolioBridge.getPreview(id);
  }

  @Post(':id/create-portfolio-draft')
  @ApiOperation({ summary: 'Create portfolio draft from a completed project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async createPortfolioDraftFromProject(
    @Param('id') id: string,
    @ActiveUser('sub') adminId: string,
    @Body() dto: CreatePortfolioDraftFromProjectDto,
  ) {
    return this.portfolioBridge.createDraft(id, adminId, dto);
  }

  /**
   * Enqueues an async project data export. A worker picks up the outbox event and
   * uploads the export file, then notifies the admin.
   */
  @Post(':id/export')
  @ApiOperation({ summary: 'Export project data (async via outbox)' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Export job queued' })
  @HttpCode(HttpStatus.OK)
  async exportProject(@Param('id') id: string, @ActiveUser('sub') adminId: string): Promise<any> {
    const { NotFoundException } = await import('@nestjs/common');

    const project = await this.prismaRead.project.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const jobId = `export_${id}_${Date.now()}`;

    await this.prismaWrite.outbox.create({
      data: {
        type: 'PROJECT_EXPORT_REQUESTED',
        aggregateType: 'PROJECT',
        aggregateId: id,
        payload: { projectId: id, jobId, requestedBy: adminId, title: project.title },
      },
    });

    return {
      projectId: id,
      jobId,
      status: 'queued',
      message: 'Export started. You will be notified when the file is ready.',
    };
  }

  /**
   * Returns a fresh signed download URL for the latest project export zip.
   * Presigned URLs expire (~1h); notifications link here instead of embedding S3 URLs.
   */
  @Get(':id/export/download')
  @ApiOperation({ summary: 'Download latest project export (fresh signed URL)' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async downloadProjectExport(@Param('id') id: string): Promise<any> {
    const project = await this.prismaRead.project.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    const doc = await this.documentGen.getLatestDocument(
      DocumentType.EXPORT_PROJECT,
      'PROJECT',
      id,
    );
    if (!doc) {
      throw new NotFoundException('No export file found for this project. Trigger export first.');
    }

    return {
      projectId: id,
      documentId: doc.id,
      documentNumber: doc.documentNumber,
      version: doc.versionNumber,
      downloadUrl: doc.downloadUrl,
      filename: `${doc.documentNumber}.zip`,
      expiresIn: 3600,
    };
  }
}
