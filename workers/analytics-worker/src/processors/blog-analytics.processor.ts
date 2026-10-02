import { Injectable } from '@nestjs/common';

import { LoggerService } from '@nestlancer/logger';

import { AnalyticsJobType, Period } from '../interfaces/analytics-job.interface';
import { AggregationService } from '../services/aggregation.service';
import { AnalyticsWorkerService } from '../services/analytics-worker.service';

@Injectable()
export class BlogAnalyticsProcessor {
  constructor(
    private readonly aggregationService: AggregationService,
    private readonly analyticsWorkerService: AnalyticsWorkerService,
    private readonly logger: LoggerService,
  ) {}

  async process(period: Period): Promise<void> {
    this.logger.log(`Processing blog analytics for period: ${period}`);

    const postStats = await this.aggregationService.aggregate('blogPost', [], {
      viewCount: 'sum',
      likeCount: 'sum',
      id: 'count',
    });

    const data = {
      totalViews: postStats[0]?._sum?.viewCount || 0,
      totalLikes: postStats[0]?._sum?.likeCount || 0,
      postCount: postStats[0]?._count?.id || 0,
    };

    await this.analyticsWorkerService.saveResult({
      type: AnalyticsJobType.BLOG_ANALYTICS,
      period,
      data,
      generatedAt: new Date(),
      cachedUntil: new Date(Date.now() + 3600000),
    });
  }
}
