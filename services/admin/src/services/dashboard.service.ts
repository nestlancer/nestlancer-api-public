import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@nestlancer/cache';
import { PrismaReadService } from '@nestlancer/database';
import { ADMIN_CONFIG } from '../config/admin.config';
import { DashboardOverview, ActivityItem, TrendData } from '../interfaces/dashboard.interface';
import { DashboardQueryDto, Period } from '../dto/dashboard-query.dto';
import { DashboardRevenueService } from './dashboard-revenue.service';
import { DashboardUsersService } from './dashboard-users.service';
import { DashboardProjectsService } from './dashboard-projects.service';
import { DashboardPerformanceService } from './dashboard-performance.service';
import { AuditService } from './audit.service';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly revenueService: DashboardRevenueService,
    private readonly usersService: DashboardUsersService,
    private readonly projectsService: DashboardProjectsService,
    private readonly performanceService: DashboardPerformanceService,
    private readonly auditService: AuditService,
    private readonly prismaRead: PrismaReadService,
    private readonly httpService: HttpService,
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
    if (previous === 0) {
      return {
        current,
        previous,
        change: 0,
        trend: current > 0 ? 'up' : 'flat',
      };
    }
    const change = ((current - previous) / previous) * 100;
    const trend = change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat';
    return { current, previous, change: Math.round(change * 100) / 100, trend };
  }

  async getOverview(query: DashboardQueryDto): Promise<DashboardOverview> {
    const period = query.period || Period.MONTH;
    const cacheKey = `admin:dashboard:overview:${period}`;

    const cached = await this.cacheService.get<DashboardOverview>(cacheKey);
    if (cached) {
      this.logger.debug(`Dashboard overview cache HIT (${period})`);
      return cached;
    }
    this.logger.debug(`Dashboard overview cache MISS (${period})`);

    const periodDays = this.periodDays(period);
    const periodStart = new Date();
    periodStart.setUTCDate(periodStart.getUTCDate() - (periodDays - 1));
    periodStart.setUTCHours(0, 0, 0, 0);
    const previousStart = new Date(periodStart);
    previousStart.setUTCDate(previousStart.getUTCDate() - periodDays);
    const previousEnd = new Date(periodStart);
    previousEnd.setUTCMilliseconds(-1);

    const [
      revenue,
      users,
      projects,
      performance,
      recentActivityRaw,
      alerts,
      pendingRequests,
      openQuotes,
      requestsThisPeriod,
      requestsPreviousPeriod,
      avgRating,
      completedClientRows,
    ] = await Promise.all([
      this.revenueService.getRevenueOverview(period),
      this.usersService.getUserOverview(period),
      this.projectsService.getProjectOverview(period),
      this.performanceService.getSystemPerformance(),
      this.auditService.getRecentActivity(10),
      this.performanceService.getAlerts(),
      this.prismaRead.projectRequest.count({ where: { status: 'SUBMITTED', deletedAt: null } }).catch(() => 0),
      this.prismaRead.quote
        .count({ where: { status: { in: ['PENDING', 'SENT', 'VIEWED'] } } })
        .catch(() => 0),
      this.prismaRead.projectRequest
        .count({ where: { deletedAt: null, createdAt: { gte: periodStart } } })
        .catch(() => 0),
      this.prismaRead.projectRequest
        .count({
          where: { deletedAt: null, createdAt: { gte: previousStart, lte: previousEnd } },
        })
        .catch(() => 0),
      this.prismaRead.projectShowcaseConsent
        .aggregate({ _avg: { rating: true }, where: { rating: { not: null } } })
        .then((r) => r._avg.rating ?? null)
        .catch(() => null),
      this.prismaRead.project
        .groupBy({
          by: ['clientId'],
          where: { status: 'COMPLETED', deletedAt: null },
          _count: { clientId: true },
        })
        .catch(() => [] as { clientId: string; _count: { clientId: number } }[]),
    ]);

    const recentActivity: ActivityItem[] = recentActivityRaw.map((a: any) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      description: a.description,
      user: a.user ? { id: a.user.id, name: a.user.name } : undefined,
      timestamp: a.timestamp,
    }));

    const clientRows = Array.isArray(completedClientRows) ? completedClientRows : [];
    const totalClientsWithProjects = clientRows.length;
    const repeatClients = clientRows.filter((r) => r._count.clientId > 1).length;
    const repeatClientRate =
      totalClientsWithProjects > 0
        ? Math.round((repeatClients / totalClientsWithProjects) * 1000) / 10
        : 0;

    // NL-ANLY-001: average over projects that contributed paid revenue in the window —
    // never fall back to divisor 1 (that made AVG === revenue when completed=0).
    // Include DISPUTED so open chargebacks do not shrink avg project value (NL-BUG-DISP-001).
    const paidProjectsInPeriod = await this.prismaRead.payment
      .groupBy({
        by: ['projectId'],
        where: {
          status: { in: ['COMPLETED', 'DISPUTED'] },
          paidAt: { gte: periodStart },
        },
        _sum: { amount: true },
      })
      .catch(() => [] as { projectId: string; _sum: { amount: number | null } }[]);

    const paidProjectCount = Array.isArray(paidProjectsInPeriod) ? paidProjectsInPeriod.length : 0;
    const avgProjectValue =
      paidProjectCount > 0 && revenue.total > 0
        ? Math.round(revenue.total / paidProjectCount / 100) * 100
        : 0;

    const overview: DashboardOverview = {
      period: {
        start: periodStart.toISOString(),
        end: new Date().toISOString(),
        days: periodDays,
      },
      summary: {
        totalUsers: users.total,
        newUsers: users.newThisMonth,
        activeProjects: projects.active,
        completedProjects: projects.completed,
        pendingRequests,
        openQuotes,
        revenueThisMonth: revenue.total,
        currency: 'INR',
      },
      trends: {
        users: users.trend,
        revenue: revenue.trend,
        projects: projects.trend,
        requests: this.computeTrend(requestsThisPeriod, requestsPreviousPeriod),
      },
      recentActivity,
      alerts,
      charts: {
        revenueByMonth: revenue.chartData,
        usersByDay: users.chartData,
        projectsByStatus: projects.byStatus,
      },
      quickStats: {
        avgProjectValue,
        avgProjectDuration: projects.avgDurationLabel || '—',
        clientSatisfaction:
          avgRating != null ? Math.round(avgRating * 10) / 10 : 0,
        repeatClientRate,
      },
      systemHealth: performance.health,
    };

    await this.cacheService.set(cacheKey, overview, ADMIN_CONFIG.DASHBOARD_CACHE_TTL);

    return overview;
  }
}
