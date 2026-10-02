import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { DatabaseModule, PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { CacheModule } from '@nestlancer/cache';
import { QueueModule, QueuePublisherService } from '@nestlancer/queue';
import { AuthLibModule } from '@nestlancer/auth-lib';

import { WebhookReceiverController } from './controllers/webhook/webhook-receiver.controller';
import { WebhooksHealthController } from './controllers/webhook/webhooks-health.controller';
import { WebhookIngestionService } from './services/webhook-ingestion.service';
import { WebhookDispatcherService } from './services/webhook-dispatcher.service';
import { RazorpayProvider } from './providers/razorpay.provider';
import { CloudflareProvider } from './providers/cloudflare.provider';
import { webhooksConfig } from './config/webhooks.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [webhooksConfig],
    }),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    CacheModule.forRoot(),
    QueueModule.forRoot({ url: process.env.RABBITMQ_URL || 'amqp://localhost:5672' }),
    AuthLibModule,
  ],
  controllers: [WebhooksHealthController, WebhookReceiverController],
  providers: [
    WebhookIngestionService,
    WebhookDispatcherService,
    RazorpayProvider,
    CloudflareProvider,
  ],
})
export class AppModule {}
