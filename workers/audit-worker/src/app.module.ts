import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CacheModule } from '@nestlancer/cache';
import { DatabaseModule } from '@nestlancer/database';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { QueueModule } from '@nestlancer/queue';
import { TracingModule } from '@nestlancer/tracing';

import { auditConfig } from './config/audit-worker.config';
import { AuditConsumer } from './consumers/audit.consumer';
import { AuditBatchInsertProcessor } from './processors/audit-batch-insert.processor';
import { AuditWorkerService } from './services/audit-worker.service';
import { BatchBufferService } from './services/batch-buffer.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    CacheModule.forRoot(),
    QueueModule.forRoot(),
  ],
  providers: [AuditConsumer, AuditWorkerService, BatchBufferService, AuditBatchInsertProcessor],
})
export class AuditModule {}
