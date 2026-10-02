import { Injectable } from '@nestjs/common';

import { LoggerService } from '@nestlancer/logger';

import { AnalyticsJobType, Period } from '../interfaces/analytics-job.interface';
import { AggregationService } from '../services/aggregation.service';
import { AnalyticsWorkerService } from '../services/analytics-worker.service';

@Injectable()
export class PortfolioAnalyticsProcessor {
  constructor(
    private readonly aggregationService: AggregationService,
    private readonly analyticsWorkerService: AnalyticsWorkerService,
    private readonly logger: LoggerService,
  ) {}

  async process(period: Period): Promise<void> {
    this.logger.log(`Processing portfolio analytics for period: ${period}`);

    // In a real scenario, we'd query portfolio_views table
    // For this implementation, we aggregate by portfolioItemId
    const viewsPerItem = await this.aggregationService.aggregate('portfolioItem', [], {
      viewCount: 'sum',
      likeCount: 'sum',
      id: 'count',
    });

    const data = {
      totalViews: viewsPerItem[0]?._sum?.viewCount || 0,
      totalLikes: viewsPerItem[0]?._sum?.likeCount || 0,
      itemCount: viewsPerItem[0]?._count?.id || 0,
    };

    await this.analyticsWorkerService.saveResult({
      type: AnalyticsJobType.PORTFOLIO_ANALYTICS,
      period,
      data,
      generatedAt: new Date(),
      cachedUntil: new Date(Date.now() + 3600000),
    });
  }
}
