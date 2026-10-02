import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { BusinessLogicException, computeQuoteTotalsPaise } from '@nestlancer/common';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

import { DuplicateFromTemplateDto } from '../dto/duplicate-from-template.dto';

export interface ProjectDuplicationPayload {
  jobId: string;
  projectId: string;
  requestedByUserId?: string;
  title?: string;
  clientId?: string;
}

export type ProjectTemplateSnapshot = {
  sourceProjectId: string;
  request: {
    title: string;
    description: string;
    category: string;
  };
  quote: {
    title: string;
    description: string;
    subtotal: number;
    taxPercentage: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;
    validUntil: string;
    terms: string | null;
    termsAndConditions: string | null;
    notes: string | null;
    internalNotes: string | null;
    paymentBreakdown: unknown;
    timeline: unknown;
    scope: unknown;
    technicalDetails: unknown;
  };
  project: {
    title: string;
    description: string;
    targetEndDate: string | null;
    adminId: string | null;
  };
  milestones: Array<{
    name: string;
    description: string | null;
    amount: number | null;
    percentage: number | null;
    dueDate: string | null;
  }>;
  meta: {
    sourceClient: { id: string; email: string; name: string };
    warnings: string[];
  };
};

type MilestoneTemplateItem = {
  name: string;
  description?: string | null;
  amount?: number | null;
  percentage?: number | null;
  dueDate?: string | null;
};

function clientDisplayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}): string {
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : user.email;
}

@Injectable()
export class ProjectDuplicationService {
  private readonly logger = new Logger(ProjectDuplicationService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async buildTemplateSnapshot(projectId: string): Promise<ProjectTemplateSnapshot> {
    const source = await this.prismaRead.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: {
        client: { select: { id: true, email: true, firstName: true, lastName: true } },
        quote: { include: { request: true } },
        milestones: { orderBy: { order: 'asc' } },
      },
    });

    if (!source?.quote?.request) {
      throw new NotFoundException('Project not found');
    }

    const { quote } = source;

    return {
      sourceProjectId: source.id,
      request: {
        title: quote.request.title,
        description: quote.request.description,
        category: quote.request.category,
      },
      quote: {
        title: quote.title,
        description: quote.description,
        subtotal: quote.subtotal,
        taxPercentage: quote.taxPercentage,
        taxAmount: quote.taxAmount,
        totalAmount: quote.totalAmount,
        currency: quote.currency,
        validUntil: quote.validUntil.toISOString(),
        terms: quote.terms,
        termsAndConditions: quote.termsAndConditions,
        notes: quote.notes,
        internalNotes: quote.internalNotes,
        paymentBreakdown: quote.paymentBreakdown ?? [],
        timeline: quote.timeline ?? {},
        scope: quote.scope ?? {},
        technicalDetails: quote.technicalDetails ?? {},
      },
      project: {
        title: source.title,
        description: source.description,
        targetEndDate: source.targetEndDate?.toISOString() ?? null,
        adminId: source.adminId,
      },
      milestones: source.milestones.map((milestone) => ({
        name: milestone.name,
        description: milestone.description,
        amount: milestone.amount,
        percentage: milestone.percentage,
        dueDate: milestone.dueDate?.toISOString() ?? null,
      })),
      meta: {
        sourceClient: {
          id: source.client.id,
          email: source.client.email,
          name: clientDisplayName(source.client),
        },
        warnings: [
          'Payment records will not be copied.',
          'Project messaging will start fresh for the new engagement.',
          'Progress entries and deliverable files will not be copied.',
        ],
      },
    };
  }

  async createFromTemplate(
    adminId: string,
    dto: DuplicateFromTemplateDto,
  ): Promise<{ requestId: string; quoteId: string; lifecycle: 'quote_draft' }> {
    const source = await this.prismaRead.project.findFirst({
      where: { id: dto.sourceProjectId, deletedAt: null },
      select: { id: true },
    });
    if (!source) {
      throw new NotFoundException('Source project not found');
    }

    const client = await this.prismaRead.user.findUnique({
      where: { id: dto.clientId },
      select: { id: true, role: true, deletedAt: true },
    });
    if (!client || client.deletedAt) {
      throw new BusinessLogicException('Client not found', 'USER_001');
    }
    if (client.role !== 'USER') {
      throw new BusinessLogicException('Target must be a client account', 'USER_002');
    }

    const validUntil = new Date(dto.quote.validUntil);
    if (Number.isNaN(validUntil.getTime()) || validUntil.getTime() < Date.now()) {
      throw new BusinessLogicException('Quote valid-until date must be in the future', 'QUOTE_010');
    }

    const items = dto.quote.items?.filter((item) => item.description.trim()) ?? [];
    if (items.length === 0) {
      throw new BusinessLogicException('At least one quote line item is required', 'QUOTE_011');
    }

    const taxPercentage = dto.quote.taxPercentage ?? 0;
    const totals = computeQuoteTotalsPaise(items, taxPercentage);
    const currency = (dto.quote.currency ?? 'INR').toUpperCase().slice(0, 3);

    const milestoneTemplate: MilestoneTemplateItem[] = (dto.milestones ?? []).map((m) => ({
      name: m.name.trim(),
      description: m.description?.trim() || null,
      amount: m.amount ?? null,
      percentage: m.percentage ?? null,
      dueDate: m.dueDate ?? null,
    }));

    const timeline: Record<string, unknown> = {};
    if (dto.project?.targetEndDate) {
      timeline.estimatedEndDate = dto.project.targetEndDate;
    }
    if (milestoneTemplate.length > 0) {
      timeline.milestoneTemplate = milestoneTemplate;
    }

    const operatorId = dto.adminId?.trim() || adminId;

    const result = await this.prismaWrite.$transaction(async (tx: any) => {
      const newRequest = await tx.projectRequest.create({
        data: {
          userId: dto.clientId,
          assigneeId: operatorId,
          title: dto.request.title.trim(),
          description: dto.request.description.trim(),
          category: dto.request.category.trim(),
          status: 'DRAFT',
        },
      });

      const newQuote = await tx.quote.create({
        data: {
          requestId: newRequest.id,
          userId: dto.clientId,
          createdById: operatorId,
          title: dto.quote.title.trim(),
          description: dto.quote.description.trim(),
          subtotal: totals.subtotal,
          taxPercentage,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          currency,
          validUntil,
          status: 'DRAFT',
          termsAndConditions: dto.quote.termsAndConditions?.trim() || null,
          internalNotes: dto.quote.internalNotes?.trim() || null,
          paymentBreakdown: totals.paymentBreakdown,
          timeline,
          scope: dto.quote.scope ?? {},
          technicalDetails: dto.quote.technicalDetails ?? {},
        },
      });

      await tx.outbox.create({
        data: {
          type: 'PROJECT_TEMPLATE_CREATED',
          aggregateType: 'QUOTE',
          aggregateId: newQuote.id,
          payload: {
            sourceProjectId: dto.sourceProjectId,
            requestId: newRequest.id,
            quoteId: newQuote.id,
            clientId: dto.clientId,
            createdById: operatorId,
          },
        },
      });

      return { requestId: newRequest.id, quoteId: newQuote.id };
    });

    this.logger.log(
      `Project template applied: ${dto.sourceProjectId} → quote ${result.quoteId} for client ${dto.clientId}`,
    );

    return { ...result, lifecycle: 'quote_draft' };
  }

  /** @deprecated Use createFromTemplate via the admin duplicate wizard. */
  async duplicateFromEvent(payload: ProjectDuplicationPayload): Promise<{ id: string } | null> {
    const sourceProjectId = payload.projectId;
    const source = await this.prismaWrite.project.findUnique({
      where: { id: sourceProjectId },
      include: {
        quote: { include: { request: true } },
        milestones: { orderBy: { order: 'asc' } },
      },
    });

    if (!source) {
      this.logger.warn(`Project duplication skipped: source ${sourceProjectId} not found`);
      return null;
    }

    const result = await this.prismaWrite.$transaction(async (tx: any) => {
      const newRequest = await tx.projectRequest.create({
        data: {
          userId: source.clientId,
          title: `Copy of ${source.quote.request.title}`,
          description: source.quote.request.description,
          category: source.quote.request.category,
          status: 'DRAFT',
        },
      });

      const newQuote = await tx.quote.create({
        data: {
          requestId: newRequest.id,
          userId: source.quote.userId,
          createdById: source.quote.createdById,
          title: `Copy of ${source.quote.title}`,
          description: source.quote.description,
          subtotal: source.quote.subtotal,
          taxPercentage: source.quote.taxPercentage,
          taxAmount: source.quote.taxAmount,
          totalAmount: source.quote.totalAmount,
          currency: source.quote.currency,
          validUntil: source.quote.validUntil,
          status: 'DRAFT',
          terms: source.quote.terms,
          termsAndConditions: source.quote.termsAndConditions,
          notes: source.quote.notes,
          internalNotes: source.quote.internalNotes,
          paymentBreakdown: source.quote.paymentBreakdown || {},
          timeline: source.quote.timeline || {},
          scope: source.quote.scope || {},
          technicalDetails: source.quote.technicalDetails || {},
        },
      });

      const newProject = await tx.project.create({
        data: {
          quoteId: newQuote.id,
          clientId: source.clientId,
          adminId: source.adminId,
          title: `Copy of ${source.title}`,
          description: source.description,
          status: 'CREATED',
          overallProgress: 0,
          startDate: null,
          targetEndDate: source.targetEndDate,
          tags: source.tags || {},
        },
      });

      if (source.milestones.length > 0) {
        await tx.milestone.createMany({
          data: source.milestones.map((milestone: any, index: number) => ({
            projectId: newProject.id,
            name: milestone.name,
            description: milestone.description,
            amount: milestone.amount,
            percentage: milestone.percentage,
            dueDate: milestone.dueDate,
            status: 'PENDING',
            progress: 0,
            order: index,
          })),
        });
      }

      await tx.outbox.create({
        data: {
          type: 'PROJECT_DUPLICATION_COMPLETED',
          aggregateType: 'PROJECT',
          aggregateId: newProject.id,
          payload: {
            jobId: payload.jobId,
            projectId: sourceProjectId,
            newProjectId: newProject.id,
            requestedByUserId: payload.requestedByUserId,
            title: newProject.title,
          },
        },
      });

      return newProject;
    });

    this.logger.log(
      `Project duplication complete: ${sourceProjectId} → ${result.id} (job=${payload.jobId})`,
    );

    return { id: result.id };
  }
}
