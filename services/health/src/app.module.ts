import { Module } from '@nestjs/common';
import { DiscoveryModule, Reflector } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@nestlancer/logger';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { NestlancerConfigModule } from '@nestlancer/config';
import { HealthLibModule } from '@nestlancer/health-lib';
import { CacheModule } from '@nestlancer/cache';
import { HealthPublicController } from './controllers/public/health.public.controller';
import { HealthDebugAdminController } from './controllers/admin/health-debug.admin.controller';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { HealthService } from './services/health.service';
import { DatabaseHealthService } from './services/database-health.service';
import { CacheHealthService } from './services/cache-health.service';
import { QueueHealthService } from './services/queue-health.service';
import { StorageHealthService } from './services/storage-health.service';
import { ExternalServicesHealthService } from './services/external-services-health.service';
import { WorkersHealthService } from './services/workers-health.service';
import { WebsocketHealthService } from './services/websocket-health.service';
import { SystemMetricsService } from './services/system-metrics.service';
import { FeatureFlagsHealthService } from './services/feature-flags-health.service';
import { ServiceRegistryHealthService } from './services/service-registry-health.service';
import { DatabaseModule } from '@nestlancer/database';
import { StorageModule } from '@nestlancer/storage';
import healthConfig from './config/health.config';

const baseImports = [
  DiscoveryModule,
  ConfigModule,
  NestlancerConfigModule.forRoot(),
  LoggerModule.forRoot(),
  DatabaseModule.forRoot(),
  MetricsModule,
  TracingModule.forRoot(),
  TerminusModule,
  HealthLibModule,
  CacheModule.forRoot(),
  StorageModule.forRoot(),
];

const appImports =
  process.env.HEALTH_E2E_DISABLE_AUTH === 'true' ? baseImports : [...baseImports, AuthLibModule];

@Module({
  imports: appImports,
  controllers: [HealthPublicController, HealthDebugAdminController],
  providers: [
    HealthService,
    DatabaseHealthService,
    CacheHealthService,
    QueueHealthService,
    StorageHealthService,
    ExternalServicesHealthService,
    WorkersHealthService,
    WebsocketHealthService,
    SystemMetricsService,
    FeatureFlagsHealthService,
    ServiceRegistryHealthService,
  ],
})
export class AppModule {}
