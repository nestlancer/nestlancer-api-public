import { Module } from '@nestjs/common';
import { NestlancerConfigModule } from '@nestlancer/config';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { DatabaseModule } from '@nestlancer/database';
import { QueueModule } from '@nestlancer/queue';
import { OutboxModule } from '@nestlancer/outbox';
import { CacheModule } from '@nestlancer/cache';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { StorageModule } from '@nestlancer/storage';
import { DocumentsModule } from '@nestlancer/documents';

import { ProjectsInternalController } from './controllers/projects-internal.controller';
import { ProjectsController } from './controllers/projects.controller';
import { ProjectsAdminController } from './controllers/projects.admin.controller';
import { ProjectsPublicController } from './controllers/projects.public.controller';
import { ProjectsService } from './services/projects.service';
import { ProjectsAdminService } from './services/projects.admin.service';
import { ProjectTimelineService } from './services/project-timeline.service';
import { ProjectDeliverablesService } from './services/project-deliverables.service';
import { ProjectPaymentsService } from './services/project-payments.service';
import { MessagingProxyService } from './services/messaging-proxy.service';
import { ProjectLifecycleConsumer } from './consumers/project-lifecycle.consumer';
import { ProjectFromQuoteService } from './services/project-from-quote.service';
import { ProjectLifecycleService } from './services/project-lifecycle.service';
import { ProjectPaymentScheduleService } from './services/project-payment-schedule.service';
import { ProjectDuplicationService } from './services/project-duplication.service';
import { ProjectPortfolioBridgeService } from './services/project-portfolio-bridge.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    QueueModule.forRoot(),
    OutboxModule.forRoot(),
    CacheModule.forRoot(),
    AuthLibModule,
    StorageModule.forRoot(),
    DocumentsModule,
  ],
  controllers: [ProjectsController, ProjectsAdminController, ProjectsPublicController, ProjectsInternalController],
  providers: [
    ProjectsService,
    ProjectsAdminService,
    ProjectTimelineService,
    ProjectDeliverablesService,
    ProjectPaymentsService,
    MessagingProxyService,
    ProjectFromQuoteService,
    ProjectPaymentScheduleService,
    ProjectLifecycleService,
    ProjectLifecycleConsumer,
    ProjectDuplicationService,
    ProjectPortfolioBridgeService,
  ],
})
export class AppModule {}
