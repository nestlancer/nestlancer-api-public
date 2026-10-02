import { Module } from '@nestjs/common';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule, PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { CacheModule } from '@nestlancer/cache';
import { QueueModule, QueuePublisherService } from '@nestlancer/queue';
import { StorageModule } from '@nestlancer/storage';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { DocumentsModule } from '@nestlancer/documents';
import { PdfModule } from '@nestlancer/pdf';

// Controllers
import { AdminHealthAdminController } from './controllers/admin/admin-health.admin.controller';
import { AuditAdminController } from './controllers/admin/audit.admin.controller';
import { DashboardAdminController } from './controllers/admin/dashboard.admin.controller';
import { EmailTemplatesAdminController } from './controllers/admin/email-templates.admin.controller';
import { ImpersonationAdminController } from './controllers/admin/impersonation.admin.controller';
import { SystemAdminController } from './controllers/admin/system.admin.controller';
import { WebhooksAdminController } from './controllers/admin/webhooks.admin.controller';
import { DocumentsAdminController } from './controllers/admin/documents.admin.controller';
import { ReportsAdminController } from './controllers/admin/reports.admin.controller';

// Services
import { AnnouncementsService } from './services/announcements.service';
import { AuditExportService } from './services/audit-export.service';
import { AuditService } from './services/audit.service';
import { BackgroundJobsService } from './services/background-jobs.service';
import { CacheManagementService } from './services/cache-management.service';
import { DashboardPerformanceService } from './services/dashboard-performance.service';
import { DashboardProjectsService } from './services/dashboard-projects.service';
import { DashboardRevenueService } from './services/dashboard-revenue.service';
import { DashboardUsersService } from './services/dashboard-users.service';
import { DashboardService } from './services/dashboard.service';
import { EmailTemplatesService } from './services/email-templates.service';
import { FeatureFlagsService } from './services/feature-flags.service';
import { ImpersonationService } from './services/impersonation.service';
import { MaintenanceModeService } from './services/maintenance-mode.service';
import { SystemConfigService } from './services/system-config.service';
import { SystemLogsService } from './services/system-logs.service';
import { WebhookDeliveriesService } from './services/webhook-deliveries.service';
import { WebhookTestingService } from './services/webhook-testing.service';
import { WebhooksManagementService } from './services/webhooks-management.service';
import { ReportsAdminService } from './services/reports-admin.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    CacheModule.forRoot(),
    QueueModule.forRoot(),
    StorageModule.forRoot(),
    HttpModule.register({
      /** Outbound calls (e.g. Prometheus) must not block admin HTTP handlers past gateway timeouts. */
      timeout: Math.min(
        Math.max(parseInt(process.env.ADMIN_HTTP_OUTBOUND_TIMEOUT_MS || '4000', 10) || 4000, 1000),
        14000,
      ),
      maxRedirects: 3,
    }),
    JwtModule.register({}),
    AuthLibModule, // Provides JwtAuthGuard and RolesGuard
    PdfModule,
    DocumentsModule,
  ],
  controllers: [
    AdminHealthAdminController,
    AuditAdminController,
    DashboardAdminController,
    EmailTemplatesAdminController,
    ImpersonationAdminController,
    SystemAdminController,
    WebhooksAdminController,
    DocumentsAdminController,
    ReportsAdminController,
  ],
  providers: [
    AnnouncementsService,
    AuditExportService,
    AuditService,
    BackgroundJobsService,
    CacheManagementService,
    DashboardPerformanceService,
    DashboardProjectsService,
    DashboardRevenueService,
    DashboardUsersService,
    DashboardService,
    EmailTemplatesService,
    FeatureFlagsService,
    ImpersonationService,
    MaintenanceModeService,
    SystemConfigService,
    SystemLogsService,
    WebhookDeliveriesService,
    WebhookTestingService,
    WebhooksManagementService,
    ReportsAdminService,
  ],
})
export class AppModule {}
