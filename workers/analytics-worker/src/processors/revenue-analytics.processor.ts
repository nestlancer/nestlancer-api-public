import { Injectable } from '@nestjs/common';

import { LoggerService } from '@nestlancer/logger';

import { AnalyticsJobType, Period } from '../interfaces/analytics-job.interface';
import { AggregationService } from '../services/aggregation.service';
import { AnalyticsWorkerService } from '../services/analytics-worker.service';

@Injectable()
export class RevenueAnalyticsProcessor {
  constructor(
    private readonly aggregationService: AggregationService,
    private readonly analyticsWorkerService: AnalyticsWorkerService,
    private readonly logger: LoggerService,
  ) {}

  async process(period: Period): Promise<void> {
    this.logger.log(`Processing revenue analytics for period: ${period}`);

    const revenueByMethod = await this.aggregationService.aggregate('payment', ['method'], {
      amount: 'sum',
    });
    const totalPayments = await this.aggregationService.aggregate('payment', ['status'], {
      id: 'count',
      amount: 'sum',
    });

    const data = {
      methods: revenueByMethod.reduce(
        (acc, curr) => ({ ...acc, [curr.method]: curr._sum.amount }),
        {},
      ),
      statuses: totalPayments.reduce(
        (acc, curr) => ({
          ...acc,
          [curr.status]: { count: curr._count.id, amount: curr._sum.amount },
        }),
        {},
      ),
    };

    await this.analyticsWorkerService.saveResult({
      type: AnalyticsJobType.REVENUE_REPORT,
      period,
      data,
      generatedAt: new Date(),
      cachedUntil: new Date(Date.now() + 86400000), // 1 day
    });
  }
}
