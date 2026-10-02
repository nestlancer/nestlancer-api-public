import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DashboardOverview } from '../interfaces/dashboard.interface';

/**
 * Data transformation object for the comprehensive system dashboard overview.
 */
export class DashboardResponseDto implements DashboardOverview {
  @ApiProperty({
    description: 'Details about the timeframe covered by this dashboard slice',
    example: { start: '2023-01-01', end: '2023-01-31', days: 31 },
  })
  period: { start: string; end: string; days: number };

  @ApiProperty({
    description: 'Aggregated high-level performance indicators',
    example: {
      totalUsers: 1500,
      newUsers: 120,
      activeProjects: 45,
      completedProjects: 85,
      pendingRequests: 12,
      openQuotes: 34,
      revenueThisMonth: 125000,
      currency: 'INR',
    },
  })
  summary: {
    totalUsers: number;
    newUsers: number;
    activeProjects: number;
    completedProjects: number;
    pendingRequests: number;
    openQuotes: number;
    revenueThisMonth: number;
    currency: string;
  };

  @ApiProperty({ description: 'Directional movement data for key metrics over time' })
  trends: any;

  @ApiProperty({
    description: 'Chronological list of significant system-wide events',
    type: [Object],
  })
  recentActivity: any[];

  @ApiProperty({ description: 'Prioritized system notifications and warnings', type: [Object] })
  alerts: any[];

  @ApiProperty({ description: 'Structured datasets for visual representation component' })
  charts: any;

  @ApiProperty({ description: 'Quick-access comparative metrics' })
  quickStats: any;

  @ApiPropertyOptional({
    description: 'Instantaneous operational state of the backend infrastructure',
    enum: ['healthy', 'degraded', 'unhealthy'],
    example: 'healthy',
  })
  systemHealth?: 'healthy' | 'degraded' | 'unhealthy';
}
