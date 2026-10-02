import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';
import { RequestStatus, QuoteStatus } from '@nestlancer/common';

interface UserRequestStats {
  total: number;
  /** Non-terminal requests still in the client pipeline (excludes draft, converted, rejected, etc.). */
  open: number;
  byStatus: Record<string, number>;
  averageResponseTime: string | null;
  pendingQuotes: number;
  conversionRate: number;
}

interface OverallRequestStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: { category: string; count: number }[];
  chartData: { date: string; count: number }[];
  averageResponseTime: string | null;
  conversionRate: number;
}

const TERMINAL_REQUEST = new Set<string>([
  RequestStatus.DRAFT,
  RequestStatus.CONVERTED_TO_PROJECT,
  RequestStatus.REJECTED,
  RequestStatus.CANCELLED,
  RequestStatus.EXPIRED_QUOTE,
]);

function statusKey(status: string): string {
  return status.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

@Injectable()
export class RequestStatsService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  async getUserStats(userId: string): Promise<UserRequestStats> {
    // Scale: groupBy + aggregate instead of loading every request/quote row.
    const [statusGroups, pendingQuotes, quotesWithTiming] = await Promise.all([
      this.prismaRead.projectRequest.groupBy({
        by: ['status'],
        where: { userId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prismaRead.quote.count({
        where: {
          request: { userId, deletedAt: null },
          status: { in: [QuoteStatus.SENT, QuoteStatus.VIEWED] },
        },
      }),
      // Cap sample for avg response time (dashboard KPI, not exact audit).
      this.prismaRead.quote.findMany({
        where: { request: { userId, deletedAt: null } },
        select: {
          createdAt: true,
          request: { select: { createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const byStatus: Record<string, number> = {};
    let total = 0;
    let open = 0;
    for (const g of statusGroups) {
      const key = statusKey(g.status);
      const n = g._count._all;
      byStatus[key] = n;
      total += n;
      if (!TERMINAL_REQUEST.has(g.status)) open += n;
    }

    const convertedCount = byStatus['convertedToProject'] || 0;
    const draftCount = byStatus['draft'] || 0;
    const totalSubmitted = Math.max(0, total - draftCount);
    const conversionRate = totalSubmitted > 0 ? (convertedCount / totalSubmitted) * 100 : 0;

    return {
      total,
      open,
      byStatus,
      averageResponseTime: this.calculateAverageResponseTime(quotesWithTiming),
      pendingQuotes,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  async getOverallStats(): Promise<OverallRequestStats> {
    const to = new Date();
    to.setUTCHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - 29);
    from.setUTCHours(0, 0, 0, 0);

    const [statusGroups, categoryGroups, recentForChart, quotesWithTiming] = await Promise.all([
      this.prismaRead.projectRequest.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prismaRead.projectRequest.groupBy({
        by: ['category'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prismaRead.projectRequest.findMany({
        where: { deletedAt: null, createdAt: { gte: from, lte: to } },
        select: { createdAt: true },
      }),
      this.prismaRead.quote.findMany({
        where: { request: { deletedAt: null } },
        select: {
          createdAt: true,
          request: { select: { createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
    ]);

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const g of statusGroups) {
      const key = statusKey(g.status);
      byStatus[key] = g._count._all;
      total += g._count._all;
    }

    const byCategory = categoryGroups
      .map((g) => ({
        category: (g.category || 'Uncategorized').trim() || 'Uncategorized',
        count: g._count._all,
      }))
      .sort((a, b) => b.count - a.count);

    const dayBuckets = new Map<string, number>();
    const cursor = new Date(from);
    while (cursor <= to) {
      dayBuckets.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    for (const r of recentForChart) {
      const key = r.createdAt.toISOString().slice(0, 10);
      if (!dayBuckets.has(key)) continue;
      dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
    }
    const chartData = Array.from(dayBuckets.entries()).map(([date, count]) => ({ date, count }));

    const convertedCount = byStatus['convertedToProject'] || 0;
    const draftCount = byStatus['draft'] || 0;
    const totalSubmitted = Math.max(0, total - draftCount);
    const conversionRate = totalSubmitted > 0 ? (convertedCount / totalSubmitted) * 100 : 0;

    return {
      total,
      byStatus,
      byCategory,
      chartData,
      averageResponseTime: this.calculateAverageResponseTime(quotesWithTiming),
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }

  private calculateAverageResponseTime(
    quotes: Array<{
      createdAt: Date;
      request: { createdAt: Date };
    }>,
  ): string | null {
    if (quotes.length === 0) {
      return null;
    }

    const responseTimes = quotes.map((quote) => {
      const requestDate = new Date(quote.request.createdAt).getTime();
      const quoteDate = new Date(quote.createdAt).getTime();
      return quoteDate - requestDate;
    });

    const avgMs = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    return this.formatDuration(avgMs);
  }

  private formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      const remainingHours = hours % 24;
      return remainingHours > 0
        ? `${days} day${days > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`
        : `${days} day${days > 1 ? 's' : ''}`;
    }

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }

    const minutes = Math.floor(ms / (1000 * 60));
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}
