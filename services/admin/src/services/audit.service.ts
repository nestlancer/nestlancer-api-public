import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { QueryAuditDto } from '../dto/query-audit.dto';

interface AuditQueryWhere {
  userId?: string;
  action?: string;
  resourceType?: string;
  category?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
}

interface AuditStats {
  totalLogs: number;
  byAction: Record<string, number>;
  byCategory: Record<string, number>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async findAll(query: QueryAuditDto) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: AuditQueryWhere = {};
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [data, total] = await Promise.all([
      this.prismaRead.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prismaRead.auditLog.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const log = await this.prismaRead.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }

  async getResourceTrail(type: string, id: string) {
    return this.prismaRead.auditLog.findMany({
      where: { resourceType: type, resourceId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async getUserTrail(userId: string) {
    return this.prismaRead.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Returns recent audit entries for dashboard activity feed.
   * Includes user relation for display.
   */
  async getRecentActivity(limit: number = 20) {
    const logs = await this.prismaRead.auditLog.findMany({
      take: Math.min(limit, 100),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      type: log.category,
      action: log.action,
      title: log.action.replace(/_/g, ' '),
      description: log.description,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      user: log.user
        ? {
            id: log.user.id,
            name:
              [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || log.user.email,
          }
        : null,
      timestamp: log.createdAt,
      metadata: log.metadata,
    }));
  }

  async getStats(): Promise<AuditStats> {
    const [totalLogs, actionGroups, categoryGroups, recentLogs] = await Promise.all([
      this.prismaRead.auditLog.count(),
      this.prismaRead.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      }),
      this.prismaRead.auditLog.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      this.getRecentActivityByDay(7),
    ]);

    const byAction = actionGroups.reduce(
      (acc, item) => {
        acc[item.action] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    const byCategory = categoryGroups.reduce(
      (acc, item) => {
        acc[item.category] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalLogs,
      byAction,
      byCategory,
      recentActivity: recentLogs,
    };
  }

  private async getRecentActivityByDay(
    days: number,
  ): Promise<Array<{ date: string; count: number }>> {
    const results: Array<{ date: string; count: number }> = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await this.prismaRead.auditLog.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
        },
      });

      results.push({
        date: date.toISOString().split('T')[0],
        count,
      });
    }

    return results.reverse();
  }

  async createLog(data: {
    userId?: string;
    action: string;
    category: string;
    description: string;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }) {
    return this.prismaWrite.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        category: data.category,
        description: data.description,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        metadata: data.metadata as any,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  }
}
