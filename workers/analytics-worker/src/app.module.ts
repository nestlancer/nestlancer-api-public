import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { CacheModule } from '@nestlancer/cache';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule } from '@nestlancer/database';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { QueueModule } from '@nestlancer/queue';
import { StorageModule } from '@nestlancer/storage';
import { TracingModule } from '@nestlancer/tracing';

import analyticsConfig from './config/analytics-worker.config';
import { AnalyticsConsumer } from './consumers/analytics.consumer';
import { DailyAggregationCron } from './cron/daily-aggregation.cron';
import { HourlyAggregationCron } from './cron/hourly-aggregation.cron';
import { WeeklyReportCron } from './cron/weekly-report.cron';
import { BlogAnalyticsProcessor } from './processors/blog-analytics.processor';
import { EngagementAnalyticsProcessor } from './processors/engagement-analytics.processor';
import { PortfolioAnalyticsProcessor } from './processors/portfolio-analytics.processor';
import { ProjectAnalyticsProcessor } from './processors/project-analytics.processor';
import { RevenueAnalyticsProcessor } from './processors/revenue-analytics.processor';
import { UserAnalyticsProcessor } from './processors/user-analytics.processor';
import { AggregationService } from './services/aggregation.service';
import { AnalyticsWorkerService } from './services/analytics-worker.service';
import { ReportGeneratorService } from './services/report-generator.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    NestConfigModule.forFeature(analyticsConfig),
    ScheduleModule.forRoot(),
    DatabaseModule.forRoot(),
    CacheModule.forRoot(),
    QueueModule.forRoot(),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    StorageModule.forRoot(),
  ],
  providers: [
    AnalyticsWorkerService,
    AggregationService,
    ReportGeneratorService,
    AnalyticsConsumer,
    UserAnalyticsProcessor,
    ProjectAnalyticsProcessor,
    RevenueAnalyticsProcessor,
    PortfolioAnalyticsProcessor,
    BlogAnalyticsProcessor,
    EngagementAnalyticsProcessor,
    HourlyAggregationCron,
    DailyAggregationCron,
    WeeklyReportCron,
  ],
})
export class AppModule {}
