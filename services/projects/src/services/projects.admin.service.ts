import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import {
  BusinessLogicException,
  ValidationException,
  assertValidTransition,
  PAYMENT_GATE_ERROR,
} from '@nestlancer/common';
import { UpdateProjectStatusAdminDto } from '../dto/update-project-status.admin.dto';
import { UpdateProjectAdminDto } from '../dto/update-project.admin.dto';

@Injectable()
export class ProjectsAdminService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  private toClientStatus(status: string): string {
    return status.toLowerCase().replace(/_([a-z])/g, (_m, letter: string) => letter.toUpperCase());
  }

  private parseStatusFilter(status?: string): string | undefined {
    if (!status || status === 'all') return undefined;
    const trimmed = status.trim();
    if (trimmed.includes('_')) return trimmed.toUpperCase();
    const normalized = trimmed
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
      .toUpperCase();
    return normalized;
  }

  private asTagRecord(tags: unknown): Record<string, unknown> {
    if (tags && typeof tags === 'object' && !Array.isArray(tags)) {
      return tags as Record<string, unknown>;
    }
    return {};
  }

  async listProjects(
    page: number,
    limit: number,
    search?: string,
    status?: string,
    clientId?: string,
  ) {
    const statusFilter = this.parseStatusFilter(status);
    const where: Record<string, unknown> = { deletedAt: null };
    if (statusFilter) {
      where.status = statusFilter;
    }
    if (clientId) {
      where.clientId = clientId;
    }
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { client: { email: { contains: q, mode: 'insensitive' } } },
        { client: { firstName: { contains: q, mode: 'insensitive' } } },
        { client: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [projects, total] = await Promise.all([
      this.prismaRead.project.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      this.prismaRead.project.count({ where }),
    ]);

    return {
      data: projects.map((p) => ({
        id: p.id,
        title: p.title,
        status: this.toClientStatus(p.status),
        clientId: p.clientId,
        client: (
          p as { client?: { id: string; firstName: string; lastName: string; email: string } }
        ).client,
        createdAt: p.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getProjectStats() {
    const groups = await this.prismaRead.project.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    });

    const byStatus: Record<string, number> = {};
    let total = 0;
    let active = 0;
    let completed = 0;

    for (const g of groups) {
      const n = g._count._all;
      total += n;
      const key = this.toClientStatus(g.status);
      byStatus[key] = n;
      if (g.status === 'COMPLETED') completed += n;
      else if (!['ARCHIVED', 'CANCELLED'].includes(g.status)) active += n;
    }

    return { total, active, completed, byStatus, monthlyTrends: [] };
  }

  async updateProjectStatus(
    projectId: string,
    adminId: string,
    dto: UpdateProjectStatusAdminDto,
  ): Promise<any> {
    const project = await this.prismaRead.project.findUnique({ where: { id: projectId } });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    const rawStatus = dto.status.toUpperCase();
    // Operator-facing aliases (DTO historically advertised PAUSED/ACTIVE).
    const STATUS_ALIASES: Record<string, string> = {
      PAUSED: 'ON_HOLD',
      ACTIVE: 'IN_PROGRESS',
    };
    const nextStatus = STATUS_ALIASES[rawStatus] ?? rawStatus;
    if (nextStatus === project.status) {
      throw new ConflictException(`Project is already ${project.status}`);
    }
    assertValidTransition('PROJECT', project.status, nextStatus);

    if (nextStatus === 'REVIEW') {
      await this.assertAllMilestonePaymentsComplete(projectId);
    }

    const result = await this.prismaWrite.$transaction(async (tx: any) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: { status: nextStatus },
      });

      await tx.outbox.create({
        data: {
          type: 'PROJECT_STATUS_CHANGED',
          aggregateType: 'PROJECT',
          aggregateId: projectId,
          payload: {
            projectId,
            clientId: project.clientId,
            userId: project.clientId,
            previousStatus: project.status,
            newStatus: nextStatus,
            status: nextStatus,
            reason: dto.reason,
            adminId,
            notifyClient: dto.notifyClient !== false,
          },
        },
      });

      return updated;
    });

    return {
      projectId,
      previousStatus: project.status,
      newStatus: result.status,
      updatedAt: result.updatedAt,
    };
  }

  async getStatusHistory(projectId: string): Promise<any> {
    const project = await this.prismaRead.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    const history = await this.prismaWrite.outbox.findMany({
      where: {
        type: { in: ['PROJECT_STATUS_CHANGED', 'PROJECT_CREATED', 'PROJECT_COMPLETED'] },
        OR: [
          { aggregateType: 'PROJECT', aggregateId: projectId },
          // Legacy rows written without aggregateType/aggregateId (NL-PROJ-001).
          { payload: { path: ['projectId'], equals: projectId } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, payload: true, createdAt: true },
      take: 50,
    });

    return {
      projectId,
      history: history.map((row) => {
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        return {
          id: row.id,
          type: row.type,
          at: row.createdAt,
          from: payload.previousStatus ?? payload.oldStatus ?? null,
          to: payload.newStatus ?? payload.status ?? null,
          reason: payload.reason ?? null,
          actorId: payload.adminId ?? payload.userId ?? null,
        };
      }),
    };
  }

  private async assertAllMilestonePaymentsComplete(projectId: string): Promise<void> {
    const pending = await this.prismaRead.payment.findMany({
      where: {
        projectId,
        status: { in: ['CREATED', 'PENDING', 'PROCESSING'] },
      },
      select: { customNotes: true },
    });

    const unpaid = pending.filter(
      (p) => !(p.customNotes as string | null)?.startsWith('REVISION_OVERFLOW:'),
    ).length;

    if (unpaid > 0) {
      throw new BusinessLogicException(
        'All milestone payments must be completed before marking the project for client review',
        PAYMENT_GATE_ERROR.UNPAID_MILESTONES,
      );
    }
  }

  async archiveProject(projectId: string): Promise<{ projectId: string; archived: true }> {
    const project = await this.prismaRead.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, status: true, tags: true },
    });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');
    if (project.status === 'ARCHIVED') {
      return { projectId, archived: true };
    }

    const tags = this.asTagRecord(project.tags);
    await this.prismaWrite.project.update({
      where: { id: projectId },
      data: {
        status: 'ARCHIVED',
        tags: {
          ...tags,
          previousStatusBeforeArchive: project.status,
        },
      },
    });

    return { projectId, archived: true };
  }

  async unarchiveProject(projectId: string): Promise<{
    projectId: string;
    unarchived: true;
    status: string;
  }> {
    const project = await this.prismaRead.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, status: true, tags: true },
    });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    const tags = this.asTagRecord(project.tags);
    const previousStatus =
      typeof tags.previousStatusBeforeArchive === 'string'
        ? tags.previousStatusBeforeArchive
        : 'IN_PROGRESS';
    const { previousStatusBeforeArchive: _removed, ...restTags } = tags;

    await this.prismaWrite.project.update({
      where: { id: projectId },
      data: {
        status: previousStatus as Prisma.ProjectUpdateInput['status'],
        tags:
          Object.keys(restTags).length > 0 ? (restTags as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });

    return { projectId, unarchived: true, status: previousStatus };
  }

  async updateProject(projectId: string, dto: UpdateProjectAdminDto): Promise<any> {
    if (!dto || (dto.title === undefined && dto.description === undefined)) {
      throw new ValidationException('At least one field must be provided to update a project');
    }

    const project = await this.prismaRead.project.findUnique({ where: { id: projectId } });
    if (!project) throw new BusinessLogicException('Project not found', 'PROJECT_001');

    return this.prismaWrite.project.update({
      where: { id: projectId },
      data: dto,
    });
  }
}
