import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';

import { CacheModule } from '@nestlancer/cache';
import { NestlancerConfigModule } from '@nestlancer/config';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { QueueModule } from '@nestlancer/queue';
import { TracingModule } from '@nestlancer/tracing';

import cdnConfig from './config/cdn-worker.config';
import { CdnConsumer } from './consumers/cdn.consumer';
import { BatchInvalidationProcessor } from './processors/batch-invalidation.processor';
import { PathInvalidationProcessor } from './processors/path-invalidation.processor';
import { BatchCollectorService } from './services/batch-collector.service';
import { CdnWorkerService } from './services/cdn-worker.service';
import { CloudflareInvalidationService } from './services/cloudflare-invalidation.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    NestConfigModule.forFeature(cdnConfig),
    HttpModule,
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    CacheModule.forRoot(),
    QueueModule.forRoot(),
  ],
  providers: [
    CdnWorkerService,
    CloudflareInvalidationService,
    BatchCollectorService,
    CdnConsumer,
    PathInvalidationProcessor,
    BatchInvalidationProcessor,
  ],
})
export class AppModule {}
