import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaReadService } from '@nestlancer/database';
import { Period } from '../dto/dashboard-query.dto';
import { ProjectMetrics, TrendData } from '../interfaces/dashboard.interface';

@Injectable()
export class DashboardProjectsService {
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

  private computeTrend(current: number, previous: number): TrendData {
    const change = previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;
    const trend = change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat';
    return { current, previous, change: Math.round(change * 100) / 100, trend };
  }

  private async computeCompletionStats(): Promise<{
    avgCompletionTimeDays: number;
    onTimeRate: number;
    avgDurationLabel: string;
  }> {
    const completed = await this.prismaRead.project.findMany({
      where: { status: 'COMPLETED', deletedAt: null },
      select: {
        createdAt: true,
        startDate: true,
        completedAt: true,
        targetEndDate: true,
      },
    });

    if (completed.length === 0) {
      return { avgCompletionTimeDays: 0, onTimeRate: 0, avgDurationLabel: '—' };
    }

    let totalDays = 0;
    let timedCount = 0;
    let onTimeCount = 0;
    let withTarget = 0;

    for (const p of completed) {
      const end = p.completedAt ?? null;
      const start = p.startDate ?? p.createdAt;
      if (end) {
        const days = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        totalDays += days;
        timedCount += 1;
        if (p.targetEndDate) {
          withTarget += 1;
          if (end.getTime() <= p.targetEndDate.getTime()) onTimeCount += 1;
        }
      }
    }

    const avgCompletionTimeDays =
      timedCount > 0 ? Math.round((totalDays / timedCount) * 10) / 10 : 0;
    const onTimeRate =
      withTarget > 0 ? Math.round((onTimeCount / withTarget) * 1000) / 10 : timedCount > 0 ? 100 : 0;

    const weeks = avgCompletionTimeDays / 7;
    const avgDurationLabel =
      avgCompletionTimeDays <= 0
        ? '—'
        : weeks >= 1.5
          ? `${Math.round(weeks * 10) / 10} weeks`
          : `${avgCompletionTimeDays} days`;

    return { avgCompletionTimeDays, onTimeRate, avgDurationLabel };
  }

  async getProjectMetrics(period: string = Period.MONTH): Promise<
    ProjectMetrics & { trend?: TrendData; avgDurationLabel?: string }
  > {
    const days = this.periodDays(period);
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setUTCDate(periodStart.getUTCDate() - (days - 1));
    periodStart.setUTCHours(0, 0, 0, 0);
    const previousStart = new Date(periodStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - days);
    const previousEnd = new Date(periodStart);
    previousEnd.setUTCMilliseconds(-1);

    const [
      total,
      active,
      completed,
      onHold,
      cancelled,
      createdThisPeriod,
      createdPrevious,
      completion,
    ] = await Promise.all([
      this.prismaRead.project.count({ where: { deletedAt: null } }),
      this.prismaRead.project.count({ where: { status: 'IN_PROGRESS', deletedAt: null } }),
      this.prismaRead.project.count({ where: { status: 'COMPLETED', deletedAt: null } }),
      this.prismaRead.project.count({ where: { status: 'ON_HOLD', deletedAt: null } }),
      this.prismaRead.project.count({ where: { status: 'CANCELLED', deletedAt: null } }),
      this.prismaRead.project.count({
        where: { deletedAt: null, createdAt: { gte: periodStart } },
      }),
      this.prismaRead.project.count({
        where: { deletedAt: null, createdAt: { gte: previousStart, lte: previousEnd } },
      }),
      this.computeCompletionStats(),
    ]);

    return {
      total,
      byStatus: {
        ACTIVE: active,
        COMPLETED: completed,
        ON_HOLD: onHold,
        CANCELLED: cancelled,
      },
      avgCompletionTimeDays: completion.avgCompletionTimeDays,
      onTimeRate: completion.onTimeRate,
      avgDurationLabel: completion.avgDurationLabel,
      trend: this.computeTrend(createdThisPeriod, createdPrevious),
    };
  }

  async getProjectOverview(period: string): Promise<{
    active: number;
    completed: number;
    trend: TrendData;
    byStatus: Record<string, number>;
    avgCompletionTimeDays: number;
    onTimeRate: number;
    avgDurationLabel: string;
  }> {
    const days = this.periodDays(period);
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setUTCDate(periodStart.getUTCDate() - (days - 1));
    periodStart.setUTCHours(0, 0, 0, 0);
    const previousStart = new Date(periodStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - days);
    const previousEnd = new Date(periodStart);
    previousEnd.setUTCMilliseconds(-1);

    const [active, completed, pendingPayment, review, onHold, createdThis, createdPrev, completion] =
      await Promise.all([
        this.prismaRead.project.count({ where: { status: 'IN_PROGRESS', deletedAt: null } }),
        this.prismaRead.project.count({ where: { status: 'COMPLETED', deletedAt: null } }),
        this.prismaRead.project.count({ where: { status: 'PENDING_PAYMENT', deletedAt: null } }),
        this.prismaRead.project.count({ where: { status: 'REVIEW', deletedAt: null } }),
        this.prismaRead.project.count({ where: { status: 'ON_HOLD', deletedAt: null } }),
        this.prismaRead.project.count({
          where: { deletedAt: null, createdAt: { gte: periodStart } },
        }),
        this.prismaRead.project.count({
          where: { deletedAt: null, createdAt: { gte: previousStart, lte: previousEnd } },
        }),
        this.computeCompletionStats(),
      ]);

    return {
      active,
      completed,
      trend: this.computeTrend(createdThis, createdPrev),
      byStatus: {
        inProgress: active,
        pendingPayment,
        review,
        completed,
        onHold,
      },
      avgCompletionTimeDays: completion.avgCompletionTimeDays,
      onTimeRate: completion.onTimeRate,
      avgDurationLabel: completion.avgDurationLabel,
    };
  }
}
