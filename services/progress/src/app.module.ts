import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { NestlancerConfigModule } from '@nestlancer/config';
import { LoggerModule } from '@nestlancer/logger';
import { DatabaseModule } from '@nestlancer/database';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { StorageModule } from '@nestlancer/storage';
import { OutboxModule } from '@nestlancer/outbox';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { QueueModule } from '@nestlancer/queue';
import { CacheModule } from '@nestlancer/cache';
import progressConfig from './config/progress.config';
import { ProgressHealthController } from './controllers/progress-health.controller';
import { ProgressAdminController } from './controllers/admin/progress.admin.controller';
import { MilestonesAdminController } from './controllers/admin/milestones.admin.controller';
import { DeliverablesAdminController } from './controllers/admin/deliverables.admin.controller';
import { ProgressController } from './controllers/user/progress.controller';
import { MilestoneApprovalsController } from './controllers/user/milestone-approvals.controller';
import { DeliverableReviewsController } from './controllers/user/deliverable-reviews.controller';

import { ProgressService } from './services/progress.service';
import { ProgressTimelineService } from './services/progress-timeline.service';
import { MilestonesService } from './services/milestones.service';
import { DeliverablesService } from './services/deliverables.service';
import { MilestoneApprovalService } from './services/milestone-approval.service';
import { DeliverableReviewService } from './services/deliverable-review.service';
import { MilestoneReviewSchedulerService } from './services/milestone-review-scheduler.service';
import { TimeEntriesService } from './services/time-entries.service';
import { TimeEntriesAdminController } from './controllers/admin/time-entries.admin.controller';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    AuthLibModule,
    StorageModule.forRoot(),
    OutboxModule.forRoot(),
    QueueModule.forRoot(),
    CacheModule.forRoot(),
    NestConfigModule.forFeature(progressConfig),
  ],
  controllers: [
    ProgressHealthController,
    ProgressAdminController,
    MilestonesAdminController,
    DeliverablesAdminController,
    ProgressController,
    MilestoneApprovalsController,
    DeliverableReviewsController,
    TimeEntriesAdminController,
  ],
  providers: [
    ProgressService,
    ProgressTimelineService,
    MilestonesService,
    DeliverablesService,
    MilestoneApprovalService,
    DeliverableReviewService,
    MilestoneReviewSchedulerService,
    TimeEntriesService,
  ],
})
export class AppModule {}
