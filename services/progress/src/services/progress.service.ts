import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BusinessLogicException,
  clientAccessibleProjectWhere,
  isClientVisibleProgress,
  normalizeProgressVisibility,
  sanitizeUserContent,
} from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { CreateProgressEntryDto } from '../dto/create-progress-entry.dto';
import { UpdateProgressEntryDto } from '../dto/update-progress-entry.dto';
import { QueryProgressDto } from '../dto/query-progress.dto';
import { ProgressEntryType, Visibility } from '../interfaces/progress.interface';
import { OutboxService } from '@nestlancer/outbox';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * Client routes must not disclose whether a foreign project exists.
   * Same 422 PROJECT_001 used by GET /projects/:id.
   */
  async assertClientProjectAccess(userId: string, projectId: string): Promise<void> {
    const project = await this.prismaRead.project.findFirst({
      where: clientAccessibleProjectWhere(userId, projectId),
      select: { id: true },
    });
    if (!project) {
      throw new BusinessLogicException('Project not found', 'PROJECT_001');
    }
  }

  async createEntry(userId: string, projectId: string, dto: CreateProgressEntryDto) {
    // NL-UI-005: never persist description that duplicates the title (client timeline body = title).
    const title = sanitizeUserContent(dto.title ?? '', 200);
    const rawDescription = sanitizeUserContent(dto.description ?? '', 5000);
    if (!title) {
      throw new BusinessLogicException('Progress note title is required', 'PROGRESS_001');
    }
    const description = rawDescription && rawDescription !== title ? rawDescription : '';

    // NL-DATA-002: idempotent create by project + title (+ milestone when present).
    const existing = await this.prismaRead.progressEntry.findFirst({
      where: {
        projectId,
        title: { equals: title, mode: 'insensitive' },
        ...(dto.milestoneId ? { milestoneId: dto.milestoneId } : {}),
      },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) {
      return existing;
    }

    // NL-NOTE-001: internal notes must never notify the client, even if the caller sets notifyClient.
    const isInternalNote = String(dto.type ?? '') === ProgressEntryType.INTERNAL_NOTE;
    const visibility = isInternalNote
      ? Visibility.INTERNAL
      : normalizeProgressVisibility(dto.visibility ?? Visibility.CLIENT_VISIBLE);
    const clientNotified =
      isInternalNote || visibility === Visibility.INTERNAL ? false : (dto.notifyClient ?? true);

    const entry = await this.prismaWrite.progressEntry.create({
      data: {
        projectId,
        type: dto.type,
        title,
        description,
        milestoneId: dto.milestoneId,
        visibility,
        actorId: userId,
        clientNotified,
        details: {
          deliverableIds: dto.deliverableIds,
          attachmentIds: dto.attachmentIds,
        },
      },
    });

    if (entry.visibility === Visibility.CLIENT_VISIBLE && entry.clientNotified) {
      const project = await this.prismaRead.project.findUnique({
        where: { id: projectId },
        select: { clientId: true, title: true },
      });

      await this.outbox.createEvent({
        aggregateType: 'PROGRESS_ENTRY',
        aggregateId: entry.id,
        type: 'PROGRESS_ENTRY_CREATED',
        payload: {
          projectId: entry.projectId,
          userId: project?.clientId,
          projectTitle: project?.title,
          entryType: entry.type,
          title: entry.title,
          entryTitle: entry.title,
          description: entry.description,
        },
      });
    }

    return entry;
  }

  async getProjectProgress(projectId: string, query: QueryProgressDto) {
    const page = query.page ?? 1;
    const limit = query.pageSize ?? query.limit ?? 20;
    const { type } = query;
    const skip = (page - 1) * limit;

    const where: any = { projectId };
    if (type) {
      where.type = type;
    }

    const [items, total] = await Promise.all([
      this.prismaRead.progressEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prismaRead.progressEntry.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEntryById(id: string) {
    const entry = await this.prismaRead.progressEntry.findUnique({
      where: { id },
    });
    if (!entry) throw new NotFoundException('Progress entry not found');
    return entry;
  }

  /** Client read of a single entry — ownership + project match + no internal notes. */
  async getClientEntry(userId: string, projectId: string, entryId: string) {
    await this.assertClientProjectAccess(userId, projectId);
    const entry = await this.prismaRead.progressEntry.findFirst({
      where: { id: entryId, projectId },
    });
    if (!entry || !isClientVisibleProgress(entry.visibility)) {
      throw new BusinessLogicException('Project not found', 'PROJECT_001');
    }
    return entry;
  }

  async updateEntry(id: string, dto: UpdateProgressEntryDto) {
    const existing = await this.prismaRead.progressEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Progress entry not found');

    const existingDetails =
      existing.details && typeof existing.details === 'object' && !Array.isArray(existing.details)
        ? (existing.details as Record<string, unknown>)
        : {};

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) {
      const nextTitle = sanitizeUserContent(dto.title, 200);
      if (!nextTitle) {
        throw new BusinessLogicException('Progress note title is required', 'PROGRESS_001');
      }
      data.title = nextTitle;
    }
    if (dto.description !== undefined) {
      const nextTitle =
        typeof data.title === 'string'
          ? data.title
          : sanitizeUserContent(String(existing.title ?? ''), 200);
      const raw = sanitizeUserContent(dto.description, 5000);
      // NL-UI-005: clear body when it only repeats the title.
      data.description = raw && raw !== nextTitle ? raw : '';
    }
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.milestoneId !== undefined) data.milestoneId = dto.milestoneId;
    if (dto.visibility !== undefined || String(dto.type ?? existing.type) === ProgressEntryType.INTERNAL_NOTE) {
      const nextType = String(dto.type ?? existing.type);
      data.visibility =
        nextType === ProgressEntryType.INTERNAL_NOTE
          ? Visibility.INTERNAL
          : normalizeProgressVisibility(dto.visibility ?? existing.visibility);
    }
    if (dto.notifyClient !== undefined || String(dto.type ?? existing.type) === ProgressEntryType.INTERNAL_NOTE) {
      const nextVisibility = String(data.visibility ?? existing.visibility);
      const nextType = String(dto.type ?? existing.type);
      data.clientNotified =
        nextType === ProgressEntryType.INTERNAL_NOTE || nextVisibility === Visibility.INTERNAL
          ? false
          : (dto.notifyClient ?? existing.clientNotified);
    }
    if (dto.deliverableIds !== undefined || dto.attachmentIds !== undefined) {
      data.details = {
        ...existingDetails,
        ...(dto.deliverableIds !== undefined ? { deliverableIds: dto.deliverableIds } : {}),
        ...(dto.attachmentIds !== undefined ? { attachmentIds: dto.attachmentIds } : {}),
      };
    }

    const entry = await this.prismaWrite.progressEntry.update({
      where: { id },
      data,
    });
    return entry;
  }

  async deleteEntry(id: string) {
    await this.prismaWrite.progressEntry.delete({
      where: { id },
    });
    return { success: true };
  }

  async getMilestoneProgress(projectId: string) {
    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
    });

    const deliverables = await this.prismaRead.deliverable.findMany({
      where: { milestoneId: { in: milestones.map((m) => m.id) } },
    });

    const deliverablesByMilestone = deliverables.reduce<Record<string, typeof deliverables>>(
      (acc, d) => {
        const key = d.milestoneId ?? '__unassigned__';
        if (!acc[key]) acc[key] = [];
        acc[key].push(d);
        return acc;
      },
      {},
    );

    return milestones.map((m) => {
      const mDeliverables = deliverablesByMilestone[m.id] ?? [];
      const completedDeliverables = mDeliverables.filter(
        (d) => (d.status as string) === 'APPROVED' || (d.status as string) === 'COMPLETED',
      ).length;
      return {
        id: m.id,
        name: m.name,
        description: m.description,
        status: m.status,
        startDate: m.startDate,
        endDate: m.endDate,
        completedAt: m.completedAt,
        order: m.order,
        deliverableCount: mDeliverables.length,
        completedDeliverableCount: completedDeliverables,
        completionPct:
          mDeliverables.length > 0
            ? Math.round((completedDeliverables / mDeliverables.length) * 100)
            : m.status === 'COMPLETED'
              ? 100
              : 0,
      };
    });
  }

  async getStatusSummary(projectId: string) {
    const project = await this.prismaRead.project.findUnique({
      where: { id: projectId },
      select: { status: true, overallProgress: true },
    });

    if (!project) {
      return { percentageComplete: 0, currentPhase: 'Not Started' };
    }

    if (project.status === 'COMPLETED') {
      return {
        percentageComplete: project.overallProgress ?? 100,
        currentPhase: 'Completed',
      };
    }

    if (project.overallProgress != null && project.overallProgress > 0) {
      const milestones = await this.prismaRead.milestone.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
      });
      const activeMilestone = milestones.find((m) => m.status === 'IN_PROGRESS');
      return {
        percentageComplete: project.overallProgress,
        currentPhase: activeMilestone
          ? activeMilestone.name
          : project.overallProgress >= 100
            ? 'Completed'
            : 'Pending',
      };
    }

    const milestones = await this.prismaRead.milestone.findMany({
      where: { projectId },
    });

    if (milestones.length === 0) {
      return { percentageComplete: 0, currentPhase: 'Not Started' };
    }

    const completedMilestoneStatuses = new Set(['COMPLETED', 'REVIEW', 'APPROVED']);
    const completed = milestones.filter((m) =>
      completedMilestoneStatuses.has(m.status as string),
    ).length;
    const percentageComplete = Math.round((completed / milestones.length) * 100);

    const activeMilestone = milestones.find((m) => m.status === 'IN_PROGRESS');
    const currentPhase = activeMilestone
      ? activeMilestone.name
      : percentageComplete === 100
        ? 'Completed'
        : 'Pending';

    return {
      percentageComplete,
      currentPhase,
    };
  }
}
