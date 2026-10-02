import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { ApiStandardResponses, ApiStandardResponse, UserRole } from '@nestlancer/common';
import { AdminGuard } from '../../guards/admin.guard';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardQueryDto } from '../../dto/dashboard-query.dto';
import { RevenueQueryDto } from '../../dto/revenue-query.dto';
import { DashboardRevenueService } from '../../services/dashboard-revenue.service';
import { DashboardUsersService } from '../../services/dashboard-users.service';
import { DashboardProjectsService } from '../../services/dashboard-projects.service';
import { DashboardPerformanceService } from '../../services/dashboard-performance.service';
import { AuditService } from '../../services/audit.service';

/**
 * Controller for administrative dashboard data and metrics.
 * Provides system-wide overview, revenue analytics, user metrics, and performance data.
 *
 * @category Admin
 */
@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('dashboard')
@ApiStandardResponses()
export class DashboardAdminController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly revenueService: DashboardRevenueService,
    private readonly usersService: DashboardUsersService,
    private readonly projectsService: DashboardProjectsService,
    private readonly performanceService: DashboardPerformanceService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves primary dashboard overview metrics including total users, active projects, and revenue summaries.
   *
   * @param query Time-range and granularity filters for the overview data
   * @returns Object containing high-level system metrics
   */
  @Get('overview')
  @ApiOperation({
    summary: 'Get dashboard overview metrics',
    description: 'Fetch a snapshot of key performance indicators and system-wide overview data.',
  })
  @ApiStandardResponse({ message: 'Dashboard overview retrieved successfully' })
  async getOverview(@Query() query: DashboardQueryDto): Promise<any> {
    return this.dashboardService.getOverview(query);
  }

  /**
   * Retrieves detailed revenue analytics, including growth rates and payment distributions.
   *
   * @param query Period and currency filters for revenue reporting
   * @returns Revenue breakdown and historical data
   */
  @Get('revenue')
  @ApiOperation({
    summary: 'Get revenue analytics',
    description:
      'Retrieve comprehensive financial reports and revenue breakdown across the platform.',
  })
  @ApiStandardResponse({ message: 'Revenue analytics retrieved successfully' })
  async getRevenue(@Query() query: RevenueQueryDto): Promise<any> {
    return this.revenueService.getRevenue(query);
  }

  /**
   * Retrieves user-related metrics such as registration trends and user distribution by role.
   *
   * @returns User growth and status statistics
   */
  @Get('users')
  @ApiOperation({
    summary: 'Get user metrics',
    description:
      'Fetch detailed statistics on user acquisition, retention, and status distribution.',
  })
  @ApiStandardResponse({ message: 'User metrics retrieved successfully' })
  async getUsers(@Query() query: DashboardQueryDto): Promise<any> {
    return this.usersService.getUserMetrics(query.period || 'MONTH');
  }

  /** PIPE-001: audit/app-map alias for GET dashboard/users */
  @Get('analytics/users')
  @ApiOperation({ summary: 'Get user analytics (alias of /dashboard/users)' })
  @ApiStandardResponse({ message: 'User analytics retrieved successfully' })
  async getUsersAnalytics(@Query() query: DashboardQueryDto): Promise<any> {
    return this.usersService.getUserMetrics(query.period || 'MONTH');
  }

  /**
   * Retrieves project-related metrics including completion rates and category distribution.
   *
   * @returns Project status and activity statistics
   */
  @Get('projects')
  @ApiOperation({
    summary: 'Get project metrics',
    description: 'Retrieve analytical data regarding project creation, status, and categories.',
  })
  @ApiStandardResponse({ message: 'Project metrics retrieved successfully' })
  async getProjects(@Query() query: DashboardQueryDto): Promise<any> {
    return this.projectsService.getProjectMetrics(query.period || 'MONTH');
  }

  /** PIPE-001: audit/app-map alias for GET dashboard/projects */
  @Get('analytics/projects')
  @ApiOperation({ summary: 'Get project analytics (alias of /dashboard/projects)' })
  @ApiStandardResponse({ message: 'Project analytics retrieved successfully' })
  async getProjectsAnalytics(@Query() query: DashboardQueryDto): Promise<any> {
    return this.projectsService.getProjectMetrics(query.period || 'MONTH');
  }

  /**
   * Retrieves aggregated system performance metrics including historical data.
   *
   * @returns A promise resolving to infrastructure and application performance data
   */
  @Get('performance')
  @ApiOperation({
    summary: 'Get system performance metrics',
    description:
      'Monitor application health, server response times, and resource usage statistics.',
  })
  @ApiStandardResponse({ message: 'Performance metrics retrieved successfully' })
  async getPerformance(): Promise<any> {
    return this.performanceService.getPerformance();
  }

  /**
   * Retrieves a chronological log of recent significant system-level activities.
   *
   * @param limit Optional max number of activity items (default 20, max 100)
   * @returns A promise resolving to a collection of recent activity events
   */
  @Get('activity')
  @ApiOperation({
    summary: 'Get recent activity',
    description:
      'Fetch a historical audit trail of significant administrative and system activities.',
  })
  @ApiStandardResponse({ message: 'Recent activity retrieved successfully' })
  async getActivity(@Query('limit') limit?: string): Promise<any> {
    const limitNum = limit ? Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100) : 20;
    return this.auditService.getRecentActivity(limitNum);
  }

  /**
   * Retrieves active system alerts, warnings, and critical operational notifications.
   *
   * @returns A promise resolving to prioritized system alerts
   */
  @Get('alerts')
  @ApiOperation({
    summary: 'Get system alerts',
    description: 'Retrieve high-priority issues and status warnings across the infrastructure.',
  })
  @ApiStandardResponse({ message: 'Alerts retrieved successfully' })
  async getAlerts(): Promise<any> {
    const data = await this.performanceService.getAlerts();
    return { data };
  }
}
