import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { LoggerService } from '@nestlancer/logger';

import { Period } from '../interfaces/analytics-job.interface';
import { BlogAnalyticsProcessor } from '../processors/blog-analytics.processor';
import { EngagementAnalyticsProcessor } from '../processors/engagement-analytics.processor';
import { PortfolioAnalyticsProcessor } from '../processors/portfolio-analytics.processor';

@Injectable()
export class HourlyAggregationCron {
  constructor(
    private readonly logger: LoggerService,
    private readonly portfolioAnalytics: PortfolioAnalyticsProcessor,
    private readonly blogAnalytics: BlogAnalyticsProcessor,
    private readonly engagementAnalytics: EngagementAnalyticsProcessor,
  ) {}

  @Cron('0 * * * *')
  async handle() {
    this.logger.log('Running hourly aggregation cron');
    await Promise.all([
      this.portfolioAnalytics.process(Period.HOURLY),
      this.blogAnalytics.process(Period.HOURLY),
      this.engagementAnalytics.process(Period.HOURLY),
    ]);
  }
}
