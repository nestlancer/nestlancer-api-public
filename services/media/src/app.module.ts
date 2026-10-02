import { Module } from '@nestjs/common';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule } from '@nestlancer/database';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { OutboxModule } from '@nestlancer/outbox';
import { QueueModule } from '@nestlancer/queue';
import { CacheModule } from '@nestlancer/cache';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { StorageModule } from './storage/storage.module';
import { MediaModule } from './media/media.module';
import { ShareModule } from './share/share.module';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    CacheModule.forRoot(),
    QueueModule.forRoot(),
    OutboxModule.forRoot(),
    AuthLibModule,
    StorageModule,
    MediaModule,
    ShareModule,
  ],
})
export class AppModule {}
