import { Injectable } from '@nestjs/common';

import { LoggerService } from '@nestlancer/logger';

import { AnalyticsJobType, Period } from '../interfaces/analytics-job.interface';
import { AggregationService } from '../services/aggregation.service';
import { AnalyticsWorkerService } from '../services/analytics-worker.service';

@Injectable()
export class UserAnalyticsProcessor {
  constructor(
    private readonly aggregationService: AggregationService,
    private readonly analyticsWorkerService: AnalyticsWorkerService,
    private readonly logger: LoggerService,
  ) {}

  async process(period: Period): Promise<void> {
    this.logger.log(`Processing user analytics for period: ${period}`);

    // Total users, active users, etc.
    const totalUsers = await this.aggregationService.aggregate('user', [], { id: 'count' });
    const usersByRole = await this.aggregationService.aggregate('user', ['role'], { id: 'count' });
    const usersByStatus = await this.aggregationService.aggregate('user', ['status'], {
      id: 'count',
    });

    const data = {
      total: totalUsers[0]?._count?.id || 0,
      roles: usersByRole.reduce((acc, curr) => ({ ...acc, [curr.role]: curr._count.id }), {}),
      statuses: usersByStatus.reduce(
        (acc, curr) => ({ ...acc, [curr.status]: curr._count.id }),
        {},
      ),
    };

    await this.analyticsWorkerService.saveResult({
      type: AnalyticsJobType.USER_STATS,
      period,
      data,
      generatedAt: new Date(),
      cachedUntil: new Date(Date.now() + 3600000), // 1 hour default
    });
  }
}
