import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';

function statusKey(status: string): string {
  return status.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

@Injectable()
export class QuoteStatsService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  async getUserStats(userId: string) {
    const groups = await this.prismaRead.quote.groupBy({
      by: ['status'],
      where: { userId, status: { notIn: ['DRAFT', 'PENDING'] } },
      _count: { _all: true },
    });

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const g of groups) {
      const key = statusKey(g.status);
      byStatus[key] = g._count._all;
      total += g._count._all;
    }

    return {
      total,
      byStatus,
      pending: (byStatus['sent'] || 0) + (byStatus['viewed'] || 0),
      accepted: byStatus['accepted'] || 0,
      declined: byStatus['declined'] || 0,
    };
  }

  async getOverallStats() {
    const [groups, acceptedSum] = await Promise.all([
      this.prismaRead.quote.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prismaRead.quote.aggregate({
        where: { status: 'ACCEPTED' },
        _sum: { totalAmount: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const g of groups) {
      const key = statusKey(g.status);
      byStatus[key] = g._count._all;
      total += g._count._all;
    }

    return {
      total,
      byStatus,
      totalAcceptedValue: Number(acceptedSum._sum.totalAmount ?? 0),
      acceptanceRate: total > 0 ? (byStatus['accepted'] || 0) / total : 0,
    };
  }
}
