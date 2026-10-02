import { Injectable, Logger } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import {
  BusinessLogicException,
  clientAccessibleProjectWhere,
  TIER_UPGRADE_RULES,
} from '@nestlancer/common';
import { ApproveProjectDto } from '../dto/approve-project.dto';
import { RequestProjectRevisionDto } from '../dto/request-project-revision.dto';
import { ProjectFromQuoteService } from './project-from-quote.service';

const RESOURCE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatProjectStatus(status: string): string {
  return status.toLowerCase().replace(/_([a-z])/g, (_g: string, letter: string) => letter.toUpperCase());
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly projectFromQuote: ProjectFromQuoteService,
  ) {}

  async getProjectByQuoteId(userId: string, quoteId: string) {
    // Read from primary after async quote-accept to avoid replica lag hiding new projects.
    const project = await this.prismaWrite.project.findFirst({
      where: { quoteId, ...clientAccessibleProjectWhere(userId) },
      select: { id: true, status: true, title: true, createdAt: true },
    });

    if (!project) return null;

    return {
      projectId: project.id,
      status: formatProjectStatus(project.status),
      title: project.title,
      createdAt: project.createdAt,
    };
  }

  /**
   * Post-accept polling endpoint: return the project if it exists, otherwise
   * synchronously provision from an accepted quote (idempotent fallback when
   * the outbox → RabbitMQ path is still catching up).
   */
  async getOrProvisionProjectByQuoteId(userId: string, quoteId: string) {
    const existing = await this.getProjectByQuoteId(userId, quoteId);
    if (existing) return existing;

    const quote = await this.prismaWrite.quote.findFirst({
      where: { id: quoteId, userId },
      select: { id: true, requestId: true, status: true },
    });

    if (!quote || quote.status !== 'ACCEPTED') {
      return null;
    }

    this.logger.log(
      `Sync-provisioning project for accepted quote ${quoteId} (outbox consumer lag fallback)`,
    );

    await this.projectFromQuote.createFromAcceptedQuote({
      quoteId: quote.id,
      requestId: quote.requestId,
      userId,
    });

    return this.getProjectByQuoteId(userId, quoteId);
  }

  async getMyProjects(userId: string) {
    const projects = await this.prismaWrite.project.findMany({
      where: clientAccessibleProjectWhere(userId),
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        // Simplified view
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase()),
      createdAt: p.createdAt,
    }));
  }

  async getUserStats(userId: string) {
    const groups = await this.prismaRead.project.groupBy({
      by: ['status'],
      where: clientAccessibleProjectWhere(userId),
      _count: { _all: true },
    });

    const stats = { total: 0, active: 0, completed: 0, cancelled: 0 };
    for (const g of groups) {
      const n = g._count._all;
      stats.total += n;
      if (g.status === 'COMPLETED') stats.completed += n;
      else if (g.status === 'CANCELLED') stats.cancelled += n;
      else stats.active += n;
    }

    return stats;
  }

  async getProjectDetails(userId: string, projectId: string) {
    if (!RESOURCE_ID.test(projectId)) {
      throw new BusinessLogicException('Project not found', 'PROJECT_001');
    }
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, projectId),
      include: {
        quote: { select: { id: true, totalAmount: true, currency: true, acceptedAt: true } },
      },
    });

    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status
        .toLowerCase()
        .replace(/_([a-z])/g, (_g: string, letter: string) => letter.toUpperCase()),
      quote: (project as any).quote,
      // Aggregating milestones, payments etc would be done here or in separate endpoint normally
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  async approveProject(userId: string, projectId: string, dto: ApproveProjectDto) {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, projectId),
    });

    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');
    if (project.status === 'COMPLETED')
      throw new BusinessLogicException('Project already completed', 'PROJECT_005');
    if (project.status !== 'REVIEW')
      throw new BusinessLogicException('Project not ready for approval', 'PROJECT_008');

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.project.update({
        where: { id: projectId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      if (dto.testimonial) {
        await tx.projectShowcaseConsent.upsert({
          where: { projectId },
          create: {
            projectId,
            allowPublicUse: dto.testimonial.allowPublicUse ?? false,
            testimonialText: dto.testimonial.text,
            testimonialAuthor: 'Client',
            rating: dto.rating,
            consentedByUserId: userId,
          },
          update: {
            allowPublicUse: dto.testimonial.allowPublicUse ?? false,
            testimonialText: dto.testimonial.text,
            testimonialAuthor: 'Client',
            rating: dto.rating,
            consentedByUserId: userId,
            consentedAt: new Date(),
          },
        });
      }

      await tx.outbox.create({
        data: {
          type: 'PROJECT_APPROVED',
          aggregateType: 'PROJECT',
          aggregateId: projectId,
          payload: {
            projectId,
            userId,
            rating: dto.rating,
            allowPublicUse: dto.testimonial?.allowPublicUse ?? false,
          },
        },
      });

      const quote = await tx.quote.findUnique({
        where: { id: project.quoteId },
        select: { totalAmount: true },
      });
      const client = await (tx as any).user.findUnique({
        where: { id: userId },
        select: {
          totalProjectsCompleted: true,
          totalSpentPaise: true,
          clientTier: true,
        },
      });
      if (client && quote) {
        const completed = (client.totalProjectsCompleted ?? 0) + 1;
        const spent = (client.totalSpentPaise ?? 0) + quote.totalAmount;
        let tier = client.clientTier ?? 'NEW';
        if (spent >= TIER_UPGRADE_RULES.VIP_MIN_SPENT_PAISE) tier = 'VIP';
        else if (completed >= TIER_UPGRADE_RULES.RETURNING_MIN_PROJECTS) tier = 'RETURNING';

        await (tx as any).user.update({
          where: { id: userId },
          data: {
            totalProjectsCompleted: completed,
            totalSpentPaise: spent,
            clientTier: tier,
          },
        });
      }
    });

    return {
      projectId,
      status: 'completed',
      approvedAt: new Date(),
      rating: dto.rating,
    };
  }

  async requestRevision(userId: string, projectId: string, dto: RequestProjectRevisionDto) {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, projectId),
    });

    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');
    if (project.status === 'COMPLETED')
      throw new BusinessLogicException('Cannot modify completed project', 'PROJECT_005');

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.project.update({
        where: { id: projectId },
        data: { status: 'REVISION_REQUESTED' },
      });

      await tx.outbox.create({
        data: {
          type: 'PROJECT_REVISION_REQUESTED',
          aggregateType: 'PROJECT',
          aggregateId: projectId,
          payload: { projectId, userId, revisionDetails: dto },
        },
      });
    });

    return {
      projectId,
      status: 'revisionRequested',
      requestedAt: new Date(),
    };
  }

  async signContract(userId: string, projectId: string, signatureName: string) {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, projectId),
      include: { quote: { select: { requiresContract: true } } } as any,
    });

    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');
    if ((project.status as string) !== 'PENDING_CONTRACT') {
      throw new BusinessLogicException('Contract signing not required', 'PROJECT_009');
    }

    const signature = typeof signatureName === 'string' ? signatureName.replace(/\s+/g, ' ').trim() : '';
    if (!signature || signature.length > 100) {
      throw new BusinessLogicException('A non-empty signature name is required', 'PROJECT_010');
    }

    const depositPaid = await this.isDepositPaid(projectId);
    const nextStatus = depositPaid ? 'IN_PROGRESS' : 'PENDING_PAYMENT';

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.project.update({
        where: { id: projectId },
        data: { status: nextStatus },
      });
      await tx.quote.update({
        where: { id: project.quoteId },
        data: { signatureName: signature, signatureDate: new Date() },
      });
      await tx.outbox.create({
        data: {
          type: 'CONTRACT_SIGNED',
          payload: { projectId, userId, signatureName: signature },
        },
      });

      if (depositPaid) {
        await tx.outbox.create({
          data: {
            type: 'PROJECT_STATUS_CHANGED',
            aggregateType: 'PROJECT',
            aggregateId: projectId,
            payload: {
              projectId,
              previousStatus: 'PENDING_CONTRACT',
              newStatus: 'IN_PROGRESS',
              status: 'IN_PROGRESS',
              reason: 'contract_signed_deposit_already_paid',
            },
          },
        });
      }
    });

    return {
      projectId,
      status: depositPaid ? 'inProgress' : 'pendingPayment',
      signedAt: new Date(),
    };
  }

  private async isDepositPaid(projectId: string): Promise<boolean> {
    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      take: 1,
      select: { id: true },
    });
    const depositMilestoneId = milestones[0]?.id;
    if (!depositMilestoneId) {
      const anyPaid = await this.prismaRead.payment.count({
        where: { projectId, status: 'COMPLETED' },
      });
      return anyPaid > 0;
    }

    const paid = await this.prismaRead.payment.count({
      where: {
        projectId,
        milestoneId: depositMilestoneId,
        status: 'COMPLETED',
      },
    });
    return paid > 0;
  }
}
