import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiStandardResponse,
  ApiStandardResponses,
  BusinessLogicException,
  Public,
  clientVisibleProgressFilter,
  clientAccessibleProjectWhere,
  doesProjectStatusAllowMessaging,
} from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { ActiveUser, JwtAuthGuard } from '@nestlancer/auth-lib';
import { ProjectsService } from '../services/projects.service';
import { ProjectTimelineService } from '../services/project-timeline.service';
import { ProjectDeliverablesService } from '../services/project-deliverables.service';
import { ProjectPaymentsService } from '../services/project-payments.service';
import { MessagingProxyService } from '../services/messaging-proxy.service';
import { ProjectPaymentScheduleService } from '../services/project-payment-schedule.service';
import { ApproveProjectDto } from '../dto/approve-project.dto';
import { RequestProjectRevisionDto } from '../dto/request-project-revision.dto';
import { SendMessageDto } from '../dto/send-message.dto';
import { SubmitFeedbackDto } from '../dto/submit-feedback.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';

/**
 * Controller for managing user-specific projects and related activities.
 */
@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
@ApiStandardResponses()
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly timelineService: ProjectTimelineService,
    private readonly deliverablesService: ProjectDeliverablesService,
    private readonly paymentsService: ProjectPaymentsService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly messagingProxy: MessagingProxyService,
    private readonly paymentSchedule: ProjectPaymentScheduleService,
  ) {}

  /**
   * Evaluates the operational status of the Projects service.
   *
   * @returns A promise resolving to the physical health status of the service
   */
  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Service health check',
    description: 'Confirm that the projects microservice is currently reachable and functioning.',
  })
  @ApiStandardResponse()
  async healthCheck(): Promise<any> {
    return { status: 'ok', service: 'projects' };
  }

  /**
   * Retrieves aggregated project metrics and KPIs for the authenticated user.
   * Includes counts for active, pending, and completed projects.
   *
   * @param userId The unique identifier of the active user
   * @returns A promise resolving to project performance statistics
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Get user project statistics',
    description:
      'Fetch high-level statistical data regarding projects associated with the account.',
  })
  @ApiStandardResponse()
  async getStats(@ActiveUser('sub') userId: string): Promise<any> {
    return this.projectsService.getUserStats(userId);
  }

  /**
   * Lists all projects associated with the current user.
   */
  @Get()
  @ApiOperation({ summary: 'List my projects' })
  @ApiStandardResponse()
  async listProjects(@ActiveUser('sub') userId: string): Promise<any> {
    return this.projectsService.getMyProjects(userId);
  }

  /**
   * Looks up a project created from an accepted quote (for post-accept polling).
   */
  @Get('by-quote/:quoteId')
  @ApiOperation({ summary: 'Get project by quote ID' })
  @ApiParam({ name: 'quoteId', description: 'Quote UUID' })
  @ApiStandardResponse()
  async getProjectByQuoteId(
    @ActiveUser('sub') userId: string,
    @Param('quoteId') quoteId: string,
  ): Promise<any> {
    const project = await this.projectsService.getOrProvisionProjectByQuoteId(userId, quoteId);
    if (!project) {
      throw new NotFoundException('Project not yet created for this quote');
    }
    return project;
  }

  /**
   * Retrieves detailed information for a specific project.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get project details' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getProjectDetails(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.projectsService.getProjectDetails(userId, id);
  }

  /**
   * Retrieves the historical timeline of events for a specific project.
   */
  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get project timeline' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getTimeline(@ActiveUser('sub') userId: string, @Param('id') id: string): Promise<any> {
    return this.timelineService.getTimeline(userId, id);
  }

  /**
   * Retrieves all deliverables associated with a specific project.
   */
  @Get(':id/deliverables')
  @ApiOperation({ summary: 'Get project deliverables' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getDeliverables(@ActiveUser('sub') userId: string, @Param('id') id: string): Promise<any> {
    return this.deliverablesService.getDeliverables(userId, id);
  }

  /**
   * Retrieves all payment records related to a specific project.
   */
  @Get(':id/payments')
  @ApiOperation({ summary: 'Get project payments' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getPayments(@ActiveUser('sub') userId: string, @Param('id') id: string): Promise<any> {
    return this.paymentsService.getPayments(userId, id);
  }

  /**
   * Approves a project and optionally provides feedback/testimonial.
   */
  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Project approved successfully. Thank you for your feedback!' })
  async approveProject(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: ApproveProjectDto,
  ): Promise<any> {
    return this.projectsService.approveProject(userId, id, dto);
  }

  @Post(':id/sign-contract')
  @ApiOperation({ summary: 'Sign project contract before deposit' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async signContract(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { signatureName: string },
  ): Promise<any> {
    return this.projectsService.signContract(userId, id, body.signatureName);
  }

  /**
   * Requests revisions for an active project.
   */
  @Post(':id/request-revision')
  @ApiOperation({ summary: 'Request project revision' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Revision request submitted successfully' })
  async requestRevision(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: RequestProjectRevisionDto,
  ): Promise<any> {
    return this.projectsService.requestRevision(userId, id, dto);
  }

  /**
   * Retrieves high-level progress tracking for a specific project.
   */
  @Get(':id/progress')
  @ApiOperation({ summary: 'Get project progress tracking' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getProgress(@ActiveUser('sub') userId: string, @Param('id') id: string): Promise<any> {
    const [project, recentUpdates] = await Promise.all([
      this.prismaRead.project.findFirst({
        where: clientAccessibleProjectWhere(userId, id),
        select: { overallProgress: true },
      }),
      this.prismaRead.progressEntry.findMany({
        where: { projectId: id, ...clientVisibleProgressFilter() },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    let milestones = await this.prismaRead.milestone.findMany({
      where: { projectId: id },
      orderBy: { order: 'asc' },
    });
    const repaired = await this.paymentSchedule.ensureDeliveryIfPayOnly(id);
    if (repaired) {
      milestones = await this.prismaWrite.milestone.findMany({
        where: { projectId: id },
        orderBy: { order: 'asc' },
      });
    }

    return { projectId: id, overallProgress: project.overallProgress, milestones, recentUpdates };
  }

  /**
   * Retrieves all milestones defined for a specific project.
   */
  @Get(':id/milestones')
  @ApiOperation({ summary: 'Get project milestones' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getMilestones(@ActiveUser('sub') userId: string, @Param('id') id: string): Promise<any> {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, id),
      select: { id: true },
    });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    let milestones = await this.prismaRead.milestone.findMany({
      where: { projectId: id },
      orderBy: { order: 'asc' },
    });

    let wroteSchedule = false;
    if (milestones.length === 0) {
      await this.paymentSchedule.backfillIfMissing(id, userId);
      wroteSchedule = true;
    } else {
      wroteSchedule = await this.paymentSchedule.ensureDeliveryIfPayOnly(id);
    }
    if (wroteSchedule) {
      milestones = await this.prismaWrite.milestone.findMany({
        where: { projectId: id },
        orderBy: { order: 'asc' },
      });
    }

    return {
      projectId: id,
      milestones: await this.enrichMilestonesWithCompletion(milestones),
    };
  }

  /** NL-DEL-003 / MS-002: expose completionPct on the client milestones route. */
  private async enrichMilestonesWithCompletion(milestones: Array<Record<string, unknown>>) {
    if (milestones.length === 0) return milestones;
    const ids = milestones.map((m) => String(m.id));
    const deliverables = await this.prismaRead.deliverable.findMany({
      where: { milestoneId: { in: ids } },
      select: { milestoneId: true, status: true },
    });
    const byMilestone = new Map<string, { total: number; done: number }>();
    for (const d of deliverables) {
      const key = d.milestoneId ?? '';
      const entry = byMilestone.get(key) ?? { total: 0, done: 0 };
      entry.total += 1;
      const status = String(d.status).toUpperCase();
      if (status === 'APPROVED' || status === 'COMPLETED') entry.done += 1;
      byMilestone.set(key, entry);
    }
    return milestones.map((m) => {
      const stats = byMilestone.get(String(m.id)) ?? { total: 0, done: 0 };
      const status = String(m.status ?? '').toUpperCase();
      const completionPct =
        stats.total > 0
          ? Math.round((stats.done / stats.total) * 100)
          : status === 'COMPLETED' || status === 'APPROVED'
            ? 100
            : typeof m.progress === 'number'
              ? Number(m.progress)
              : 0;
      return {
        ...m,
        deliverableCount: stats.total,
        completedDeliverableCount: stats.done,
        completionPct,
        progress: typeof m.progress === 'number' ? m.progress : completionPct,
      };
    });
  }

  /**
   * Retrieves a paginated list of project-related internal messages.
   */
  @Get(':id/messages')
  @ApiOperation({ summary: 'Get project messages' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  async getMessages(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<any> {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, id),
      select: { id: true, status: true },
    });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');
    if (!doesProjectStatusAllowMessaging(project.status)) {
      throw new BusinessLogicException(
        'Messaging is not available for this project yet or it has been closed',
        'PROJECT_002',
      );
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [messages, total] = await Promise.all([
      this.prismaRead.message.findMany({
        where: { projectId: id },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prismaRead.message.count({ where: { projectId: id } }),
    ]);

    return {
      projectId: id,
      messages,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Sends a new message within the specific project context.
   */
  @Post(':id/messages')
  @ApiOperation({ summary: 'Send message to project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Message sent successfully' })
  async sendMessage(
    @ActiveUser('sub') userId: string,
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ): Promise<any> {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, id),
      select: { id: true },
    });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    const raw = (await this.messagingProxy.postProjectMessage(req.headers.authorization, id, {
      content: dto.content,
    })) as { data?: { id?: string } };
    const msg = raw?.data ?? raw;
    const messageId =
      typeof msg === 'object' && msg !== null && 'id' in msg
        ? String((msg as { id: string }).id)
        : '';
    return { projectId: id, messageId, sent: true };
  }

  /**
   * Submits qualitative feedback for a specific project.
   */
  @Post(':id/feedback')
  @ApiOperation({ summary: 'Submit project feedback' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse({ message: 'Feedback submitted successfully' })
  async submitFeedback(
    @ActiveUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto,
  ): Promise<any> {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, id),
      select: { id: true },
    });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    const entry = await this.prismaWrite.$transaction(async (tx: any) => {
      const created = await tx.progressEntry.create({
        data: {
          projectId: id,
          type: 'FEEDBACK',
          title: dto.title,
          description: dto.feedback,
          actorId: userId,
          details: {},
        },
      });

      await tx.outbox.create({
        data: {
          type: 'PROJECT_FEEDBACK_SUBMITTED',
          aggregateType: 'PROJECT',
          aggregateId: id,
          payload: {
            projectId: id,
            feedbackId: created.id,
            userId,
            title: dto.title,
            feedback: dto.feedback,
          },
        },
      });

      return created;
    });

    return { projectId: id, feedbackId: entry.id, submitted: true };
  }

  /**
   * Retrieves all submitted feedback for a specific project.
   */
  @Get(':id/feedback')
  @ApiOperation({ summary: 'Get project feedback' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiStandardResponse()
  async getFeedback(@ActiveUser('sub') userId: string, @Param('id') id: string): Promise<any> {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, id),
      select: { id: true },
    });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    const feedback = await this.prismaRead.progressEntry.findMany({
      where: { projectId: id, type: 'FEEDBACK' },
      orderBy: { createdAt: 'desc' },
    });
    return { projectId: id, feedback };
  }
}
