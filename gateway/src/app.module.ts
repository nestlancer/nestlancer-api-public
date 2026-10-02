import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuditModule } from '@nestlancer/audit';
import { AuthLibModule, JwtAuthGuard, RolesGuard, PermissionsGuard } from '@nestlancer/auth-lib';
import { CacheModule } from '@nestlancer/cache';
import { CircuitBreakerModule } from '@nestlancer/circuit-breaker';
import { NestlancerConfigModule } from '@nestlancer/config';
import { CryptoModule } from '@nestlancer/crypto';
import { HealthLibModule } from '@nestlancer/health-lib';
import { LoggerModule, RequestLoggerMiddleware } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { MaintenanceGuard, MiddlewareModule, ThrottleGuard } from '@nestlancer/middleware';
import { TracingModule, CorrelationIdMiddleware } from '@nestlancer/tracing';

// Proxy infrastructure
import { AdminModule } from './modules/admin/admin.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { AuthModule } from './modules/auth/auth.module';

// Domain modules
import { MessagesModule } from './modules/messages/messages.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MediaModule } from './modules/media/media.module';
import { PortfolioModule } from './modules/portfolio/portfolio.module';
import { BlogModule } from './modules/blog/blog.module';
import { ContactModule } from './modules/contact/contact.module';
import { HealthModule } from './modules/health/health.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProgressModule } from './modules/progress/progress.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { RequestsModule } from './modules/requests/requests.module';
import { UsersModule } from './modules/users/users.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ProxyModule } from './proxy';
import { SwaggerDocsModule } from './swagger/swagger.module';
import { SystemStatusController } from './modules/system/system-status.controller';
import { AccessTokenRevocationGuard } from './guards/access-token-revocation.guard';
import { publicHttpCacheMiddleware } from './middleware/public-http-cache.middleware';

@Module({
  imports: [
    // Infrastructure — only what the gateway needs
    NestlancerConfigModule.forRoot(),
    CacheModule.forRoot(),
    MiddlewareModule,
    ProxyModule,
    AuthLibModule,
    CryptoModule,
    LoggerModule,
    MetricsModule,
    TracingModule,
    HealthLibModule,
    AuditModule,
    CircuitBreakerModule,

    // Domain modules
    AuthModule,
    UsersModule,
    RequestsModule,
    QuotesModule,
    ProjectsModule,
    ProgressModule,
    PaymentsModule,
    MessagesModule,
    NotificationsModule,
    MediaModule,
    PortfolioModule,
    BlogModule,
    ContactModule,
    AdminModule,
    DocumentsModule,
    InvoicesModule,
    HealthModule,
    WebhooksModule,
    SwaggerDocsModule,
  ],
  controllers: [SystemStatusController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottleGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: AccessTokenRevocationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: MaintenanceGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, RequestLoggerMiddleware, publicHttpCacheMiddleware)
      .forRoutes('*');
  }
}
