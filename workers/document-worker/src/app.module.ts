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
import { documentWorkerConfig } from './config/document-worker.config';
import { DocumentConsumer } from './consumers/document.consumer';
import { DocumentProcessorService } from './services/document-processor.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    NestConfigModule.forFeature(documentWorkerConfig),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    QueueModule.forRoot(),
    CacheModule.forRoot(),
    DocumentsModule,
  ],
  providers: [DocumentProcessorService, DocumentConsumer],
})
export class AppModule {}
