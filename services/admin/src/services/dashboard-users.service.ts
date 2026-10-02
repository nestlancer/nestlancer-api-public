import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaReadService } from '@nestlancer/database';
import { Period } from '../dto/dashboard-query.dto';
import { TrendData, UserMetrics } from '../interfaces/dashboard.interface';

@Injectable()
export class DashboardUsersService {
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

  private dayKey(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private computeTrend(current: number, previous: number): TrendData {
    const change = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
    const trend = change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat';
    return { current, previous, change: Math.round(change * 100) / 100, trend };
  }

  private async buildDailyChart(days: number): Promise<{ date: string; count: number }[]> {
    const to = new Date();
    to.setUTCHours(23, 59, 59, 999);
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - (days - 1));
    from.setUTCHours(0, 0, 0, 0);

    const users = await this.prismaRead.user.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = new Map<string, number>();
    const cursor = new Date(from);
    while (cursor <= to) {
      buckets.set(this.dayKey(cursor), 0);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    for (const u of users) {
      const key = this.dayKey(u.createdAt);
      if (!buckets.has(key)) continue;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
  }

  async getUserMetrics(period: string = Period.MONTH): Promise<UserMetrics> {
    const days = this.periodDays(period);
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setUTCDate(periodStart.getUTCDate() - (days - 1));
    periodStart.setUTCHours(0, 0, 0, 0);

    const previousStart = new Date(periodStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - days);
    const previousEnd = new Date(periodStart);
    previousEnd.setUTCMilliseconds(-1);

    const [total, active, newThisPeriod, previousNew, users, admins, chartData] = await Promise.all([
      this.prismaRead.user.count(),
      this.prismaRead.user.count({ where: { status: 'ACTIVE' } }),
      this.prismaRead.user.count({ where: { createdAt: { gte: periodStart } } }),
      this.prismaRead.user.count({
        where: { createdAt: { gte: previousStart, lte: previousEnd } },
      }),
      this.prismaRead.user.count({ where: { role: 'USER' } }),
      this.prismaRead.user.count({ where: { role: 'ADMIN' } }),
      this.buildDailyChart(Math.min(days, 90)),
    ]);

    return {
      total,
      active,
      newThisMonth: newThisPeriod,
      byRole: { user: users, admin: admins },
      chartData,
      trend: this.computeTrend(newThisPeriod, previousNew),
    };
  }

  async getUserOverview(period: string): Promise<{
    total: number;
    newThisMonth: number;
    trend: TrendData;
    chartData: { date: string; new: number; active: number }[];
  }> {
    const metrics = await this.getUserMetrics(period);
    const chartData = metrics.chartData.map((p) => ({
      date: p.date,
      new: p.count,
      active: 0,
    }));

    return {
      total: metrics.total,
      newThisMonth: metrics.newThisMonth,
      trend: metrics.trend ?? this.computeTrend(metrics.newThisMonth, 0),
      chartData,
    };
  }
}
