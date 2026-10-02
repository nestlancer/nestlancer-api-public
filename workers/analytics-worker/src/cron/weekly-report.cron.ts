import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { LoggerService } from '@nestlancer/logger';

import { AnalyticsJobType, Period, ExportFormat } from '../interfaces/analytics-job.interface';
import { AnalyticsWorkerService } from '../services/analytics-worker.service';
import { ReportGeneratorService } from '../services/report-generator.service';

@Injectable()
export class WeeklyReportCron {
  constructor(
    private readonly logger: LoggerService,
    private readonly reportGenerator: ReportGeneratorService,
    private readonly analyticsWorker: AnalyticsWorkerService,
  ) {}

  @Cron('0 3 * * 1')
  async handle() {
    this.logger.log('Running weekly report generation cron');

    const revenueData = await this.analyticsWorker.getLatest(AnalyticsJobType.REVENUE_REPORT);
    const projectData = await this.analyticsWorker.getLatest(AnalyticsJobType.PROJECT_STATS);

    if (revenueData) {
      await this.reportGenerator.generateReport(
        AnalyticsJobType.REVENUE_REPORT,
        Period.WEEKLY,
        ExportFormat.PDF,
        revenueData,
      );
    }

    if (projectData) {
      await this.reportGenerator.generateReport(
        AnalyticsJobType.PROJECT_STATS,
        Period.WEEKLY,
        ExportFormat.PDF,
        projectData,
      );
    }
  }
}
