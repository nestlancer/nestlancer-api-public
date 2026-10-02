import { Module } from '@nestjs/common';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule } from '@nestlancer/database';
import { CacheModule } from '@nestlancer/cache';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { WsHealthController } from './controllers/ws-health.controller';
import { ProjectGateway } from './gateways/project.gateway';
import { MessagingGateway } from './gateways/messaging.gateway';
import { NotificationGateway } from './gateways/notification.gateway';
import { WsConnectionService } from './services/connection.service';
import { WsPresenceService } from './services/presence.service';
import { HeartbeatService } from './services/heartbeat.service';
import { RedisSubscriberService } from './services/redis-subscriber.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    DatabaseModule.forRoot(),
    CacheModule.forRoot(),
    AuthLibModule,
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
  ],
  controllers: [WsHealthController],
  providers: [
    ProjectGateway,
    MessagingGateway,
    NotificationGateway,
    WsConnectionService,
    WsPresenceService,
    HeartbeatService,
    RedisSubscriberService,
  ],
})
export class WsAppModule {}
