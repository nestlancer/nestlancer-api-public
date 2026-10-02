import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaReadService } from '@nestlancer/database';
import { RevenueQueryDto } from '../dto/revenue-query.dto';
import { Period } from '../dto/dashboard-query.dto';
import { RevenueData, TrendData } from '../interfaces/dashboard.interface';

type ChartPoint = { date: string; amount: number };
type CategoryPoint = { category: string; amount: number };

@Injectable()
export class DashboardRevenueService {
  constructor(
    private readonly httpService: HttpService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  private periodDays(period?: string): number {
    switch (period) {
      case Period.TODAY:
        return 1;
      case Period.WEEK:
        return 7;
      case Period.QUARTER:
        return 90;
      case Period.YEAR:
        return 365;
      case Period.MONTH:
      default:
        return 30;
    }
  }

  private resolveRange(query: { period?: string; from?: string; to?: string }): {
    from: Date;
    to: Date;
    days: number;
    granularity: 'day' | 'month';
  } {
    const to = query.to ? new Date(query.to) : new Date();
    to.setUTCHours(23, 59, 59, 999);

    let from: Date;
    if (query.from) {
      from = new Date(query.from);
      from.setUTCHours(0, 0, 0, 0);
    } else {
      const days = this.periodDays(query.period);
      from = new Date(to);
      from.setUTCDate(from.getUTCDate() - (days - 1));
      from.setUTCHours(0, 0, 0, 0);
    }

    const days = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );
    const granularity: 'day' | 'month' =
      query.period === Period.YEAR || query.period === Period.QUARTER || days > 60
        ? 'month'
        : 'day';

    return { from, to, days, granularity };
  }

  private dayKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private monthKey(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private paymentWhen(p: { paidAt: Date | null; createdAt: Date }): Date {
    return p.paidAt ?? p.createdAt;
  }

  private async fetchCompletedPayments(from: Date, to: Date) {
    // Captured money stays in revenue until refunded — open disputes must not
    // yank the admin "Revenue (month)" KPI (NL-BUG-DISP-001).
    return this.prismaRead.payment.findMany({
      where: {
        status: { in: ['COMPLETED', 'DISPUTED'] },
        OR: [
          { paidAt: { gte: from, lte: to } },
          { paidAt: null, createdAt: { gte: from, lte: to } },
        ],
      },
      select: {
        amount: true,
        paidAt: true,
        createdAt: true,
        method: true,
        project: {
          select: {
            quote: {
              select: {
                request: { select: { category: true } },
              },
            },
          },
        },
      },
      orderBy: { paidAt: 'asc' },
    });
  }

  private buildChartData(
    payments: Array<{ amount: number; paidAt: Date | null; createdAt: Date }>,
    from: Date,
    to: Date,
    granularity: 'day' | 'month',
  ): ChartPoint[] {
    const buckets = new Map<string, number>();

    if (granularity === 'month') {
      const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
      const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
      while (cursor <= end) {
        buckets.set(this.monthKey(cursor), 0);
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      }
    } else {
      const cursor = new Date(from);
      cursor.setUTCHours(0, 0, 0, 0);
      const end = new Date(to);
      end.setUTCHours(0, 0, 0, 0);
      while (cursor <= end) {
        buckets.set(this.dayKey(cursor), 0);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
    }

    for (const p of payments) {
      const when = this.paymentWhen(p);
      const key = granularity === 'month' ? this.monthKey(when) : this.dayKey(when);
      if (!buckets.has(key)) continue;
      buckets.set(key, (buckets.get(key) ?? 0) + Number(p.amount || 0));
    }

    return Array.from(buckets.entries()).map(([date, amount]) => ({ date, amount }));
  }

  private buildByCategory(
    payments: Array<{
      amount: number;
      method: string | null;
      project?: { quote?: { request?: { category: string } | null } | null } | null;
    }>,
  ): CategoryPoint[] {
    const buckets = new Map<string, number>();
    for (const p of payments) {
      const category =
        p.project?.quote?.request?.category?.trim() ||
        (p.method ? `Method: ${p.method}` : 'Uncategorized');
      buckets.set(category, (buckets.get(category) ?? 0) + Number(p.amount || 0));
    }
    return Array.from(buckets.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }

  private computeTrend(chartData: ChartPoint[]): TrendData {
    if (chartData.length < 2) {
      const current = chartData[0]?.amount ?? 0;
      return { current, previous: 0, change: 0, trend: current > 0 ? 'up' : 'flat' };
    }

    const mid = Math.floor(chartData.length / 2);
    const previous = chartData.slice(0, mid).reduce((s, p) => s + p.amount, 0);
    const current = chartData.slice(mid).reduce((s, p) => s + p.amount, 0);
    const change = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
    const trend = change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat';
    return { current, previous, change: Math.round(change * 100) / 100, trend };
  }

  async getRevenue(query: RevenueQueryDto): Promise<RevenueData> {
    const range = this.resolveRange(query);
    const payments = await this.fetchCompletedPayments(range.from, range.to);
    const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const chartData = this.buildChartData(payments, range.from, range.to, range.granularity);
    const byCategory = this.buildByCategory(payments);
    const trends = this.computeTrend(chartData);

    return {
      total,
      currency: 'INR',
      trends,
      byCategory,
      chartData,
    };
  }

  async getRevenueOverview(period: string): Promise<{
    total: number;
    trend: TrendData;
    chartData: ChartPoint[];
    byCategory: CategoryPoint[];
  }> {
    const data = await this.getRevenue({ period: period as Period });
    return {
      total: data.total,
      trend: data.trends,
      chartData: data.chartData,
      byCategory: data.byCategory,
    };
  }
}
