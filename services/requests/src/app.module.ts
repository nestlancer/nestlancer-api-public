import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { NestlancerConfigModule } from '@nestlancer/config';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { DatabaseModule } from '@nestlancer/database';
import { QueueModule } from '@nestlancer/queue';
import { OutboxModule } from '@nestlancer/outbox';
import { CacheModule } from '@nestlancer/cache';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { CacheInterceptor } from '@nestlancer/middleware';
import { StorageModule } from '@nestlancer/storage';

import { RequestsController } from './controllers/requests.controller';
import { RequestsAdminController } from './controllers/requests.admin.controller';
import { ServicesPublicController } from './controllers/services.public.controller';
import { ServicePackagesAdminController } from './controllers/service-packages.admin.controller';
import { RequestsService } from './services/requests.service';
import { RequestsAdminService } from './services/requests.admin.service';
import { RequestAttachmentsService } from './services/request-attachments.service';
import { RequestStatsService } from './services/request-stats.service';
import { QuotesAdminService } from './services/quotes.admin.service';
import { ServiceCatalogService } from './services/service-catalog.service';
import { AdminCapacityService } from './services/admin-capacity.service';

import requestsConfig from './config/requests.config';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    NestConfigModule.forFeature(requestsConfig),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    QueueModule.forRoot(),
    OutboxModule.forRoot(),
    CacheModule.forRoot(),
    AuthLibModule,
    StorageModule.forRoot(),
  ],
  controllers: [
    RequestsController,
    RequestsAdminController,
    ServicesPublicController,
    ServicePackagesAdminController,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
    RequestsService,
    RequestsAdminService,
    RequestAttachmentsService,
    RequestStatsService,
    QuotesAdminService,
    ServiceCatalogService,
    AdminCapacityService,
  ],
})
export class AppModule {}
