import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { LoggerService } from '@nestlancer/logger';

import { Period } from '../interfaces/analytics-job.interface';
import { ProjectAnalyticsProcessor } from '../processors/project-analytics.processor';
import { RevenueAnalyticsProcessor } from '../processors/revenue-analytics.processor';
import { UserAnalyticsProcessor } from '../processors/user-analytics.processor';

@Injectable()
export class DailyAggregationCron {
  constructor(
    private readonly logger: LoggerService,
    private readonly userAnalytics: UserAnalyticsProcessor,
    private readonly projectAnalytics: ProjectAnalyticsProcessor,
    private readonly revenueAnalytics: RevenueAnalyticsProcessor,
  ) {}

  @Cron('0 2 * * *')
  async handle() {
    this.logger.log('Running daily aggregation cron');
    await Promise.all([
      this.userAnalytics.process(Period.DAILY),
      this.projectAnalytics.process(Period.DAILY),
      this.revenueAnalytics.process(Period.DAILY),
    ]);
  }
}
