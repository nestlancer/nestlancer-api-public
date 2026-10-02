import { Injectable } from '@nestjs/common';

import { LoggerService } from '@nestlancer/logger';

import { AnalyticsJobType, Period } from '../interfaces/analytics-job.interface';
import { AggregationService } from '../services/aggregation.service';
import { AnalyticsWorkerService } from '../services/analytics-worker.service';

@Injectable()
export class EngagementAnalyticsProcessor {
  constructor(
    private readonly aggregationService: AggregationService,
    private readonly analyticsWorkerService: AnalyticsWorkerService,
    private readonly logger: LoggerService,
  ) {}

  async process(period: Period): Promise<void> {
    this.logger.log(`Processing engagement analytics for period: ${period}`);

    const totalMessages = await this.aggregationService.aggregate('message', [], { id: 'count' });
    const totalNotifications = await this.aggregationService.aggregate('notification', [], {
      id: 'count',
    });

    const data = {
      messagesCount: totalMessages[0]?._count?.id || 0,
      notificationsCount: totalNotifications[0]?._count?.id || 0,
    };

    await this.analyticsWorkerService.saveResult({
      type: AnalyticsJobType.ENGAGEMENT_METRICS,
      period,
      data,
      generatedAt: new Date(),
      cachedUntil: new Date(Date.now() + 3600000),
    });
  }
}
