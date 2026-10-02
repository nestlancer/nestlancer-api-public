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
import { NotificationsModule } from './notifications/notifications.module';
import { PreferencesModule } from './preferences/preferences.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { InternalModule } from './internal/internal.module';
import { PushModule } from './push/push.module';

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
    // Preferences before Notifications so GET /notifications/preferences and /channels
    // are registered before GET /notifications/:id (avoids :id matching "preferences"|"channels").
    PreferencesModule,
    NotificationsModule,
    SubscriptionsModule,
    InternalModule,
    PushModule,
  ],
})
export class AppModule {}
