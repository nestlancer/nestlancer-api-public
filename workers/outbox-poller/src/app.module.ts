import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { CacheModule } from '@nestlancer/cache';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule } from '@nestlancer/database';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { QueueModule } from '@nestlancer/queue';
import { TracingModule } from '@nestlancer/tracing';

import outboxConfig from './config/outbox-poller.config';
import { LeaderElectionService } from './services/leader-election.service';
import { OutboxPollerService } from './services/outbox-poller.service';
import { OutboxPublisherService } from './services/outbox-publisher.service';
import { QueueTopologyService } from './services/queue-topology.service';
import { StaleEventMonitorService } from './services/stale-event-monitor.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    NestConfigModule.forFeature(outboxConfig),
    ScheduleModule.forRoot(),
    CacheModule.forRoot(),
    DatabaseModule.forRoot(),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    QueueModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        url: configService.get<string>('RABBITMQ_URL'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    OutboxPollerService,
    OutboxPublisherService,
    QueueTopologyService,
    LeaderElectionService,
    StaleEventMonitorService,
  ],
})
export class AppModule {}
