import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class TimeEntriesService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async list(query: { milestoneId?: string; projectId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const where: Record<string, string> = {};
    if (query.milestoneId) where.milestoneId = query.milestoneId;
    if (query.projectId) where.projectId = query.projectId;

    const [items, total] = await Promise.all([
      (this.prismaRead as any).timeEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prismaRead as any).timeEntry.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(
    adminId: string,
    body: {
      milestoneId: string;
      durationMinutes: number;
      description?: string;
      startedAt?: string;
      endedAt?: string;
    },
  ) {
    const milestone = await this.prismaRead.milestone.findUnique({
      where: { id: body.milestoneId },
      select: { id: true, projectId: true },
    });
    if (!milestone) throw new NotFoundException('Milestone not found');

    const entry = await (this.prismaWrite as any).timeEntry.create({
      data: {
        milestoneId: body.milestoneId,
        projectId: milestone.projectId,
        adminId,
        durationMinutes: body.durationMinutes,
        description: body.description,
        startedAt: body.startedAt ? new Date(body.startedAt) : null,
        endedAt: body.endedAt ? new Date(body.endedAt) : null,
      },
    });

    const totalMinutes = await (this.prismaRead as any).timeEntry.aggregate({
      where: { milestoneId: body.milestoneId },
      _sum: { durationMinutes: true },
    });
    await this.prismaWrite.milestone.update({
      where: { id: body.milestoneId },
      data: { actualHours: (totalMinutes._sum.durationMinutes ?? 0) / 60 } as any,
    });

    return entry;
  }
}
