import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestlancer/cache';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule } from '@nestlancer/database';
import { DocumentsModule } from '@nestlancer/documents';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { QueueModule } from '@nestlancer/queue';
import { TracingModule } from '@nestlancer/tracing';
import { exportWorkerConfig } from './config/export-worker.config';
import { ExportConsumer } from './consumers/export.consumer';
import { ExportProcessorService } from './services/export-processor.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    NestConfigModule.forFeature(exportWorkerConfig),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    CacheModule.forRoot(),
    QueueModule.forRoot(),
    DocumentsModule,
  ],
  providers: [ExportProcessorService, ExportConsumer],
})
export class AppModule {}
