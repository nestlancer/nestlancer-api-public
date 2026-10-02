import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { CacheModule } from '@nestlancer/cache';
import { DatabaseModule } from '@nestlancer/database';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { QueueModule } from '@nestlancer/queue';
import { TracingModule } from '@nestlancer/tracing';

import { notificationWorkerConfig } from './config/notification-worker.config';
import { NotificationConsumer } from './consumers/notification.consumer';
import { InAppNotificationProcessor } from './processors/in-app-notification.processor';
import { AdminRecipientResolverService } from './services/admin-recipient-resolver.service';
import { NotificationBroadcastProcessor } from './services/notification-broadcast.processor';
import { NotificationDispatcherService } from './services/notification-dispatcher.service';
import { NotificationEnrichmentService } from './services/notification-enrichment.service';
import { NotificationMetricsService } from './services/notification-metrics.service';
import { NotificationPreferenceGateService } from './services/notification-preference-gate.service';
import { NotificationRetryService } from './services/notification-retry.service';
import { NotificationTemplateResolverService } from './services/notification-template-resolver.service';
import { NotificationWorkerService } from './services/notification-worker.service';
import { PushProviderService } from './services/push-provider.service';
import { RedisPublisherService } from './services/redis-publisher.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ConfigModule.forFeature(notificationWorkerConfig),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    CacheModule.forRoot(),
    QueueModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        url: config.get('notificationWorker.rabbitmq.url'),
      }),
    }),
  ],
  providers: [
    NotificationWorkerService,
    NotificationBroadcastProcessor,
    NotificationDispatcherService,
    NotificationEnrichmentService,
    NotificationMetricsService,
    NotificationTemplateResolverService,
    NotificationPreferenceGateService,
    AdminRecipientResolverService,
    RedisPublisherService,
    PushProviderService,
    NotificationRetryService,
    InAppNotificationProcessor,
    NotificationConsumer,
  ],
})
export class AppModule {}
