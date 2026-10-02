import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import { CacheModule } from '@nestlancer/cache';
import { PaymentCompletionService } from '@nestlancer/common';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule } from '@nestlancer/database';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { QueueModule } from '@nestlancer/queue';
import { TracingModule } from '@nestlancer/tracing';

import webhookConfig from './config/webhook-worker.config';
import { WebhookConsumer } from './consumers/webhook.consumer';
import { GithubDeploymentHandler } from './handlers/github/deployment.handler';
import { GithubPullRequestHandler } from './handlers/github/pull-request.handler';
import { GithubPushHandler } from './handlers/github/push.handler';
import { DisputeCreatedHandler } from './handlers/razorpay/dispute-created.handler';
import { PaymentCapturedHandler } from './handlers/razorpay/payment-captured.handler';
import { PaymentFailedHandler } from './handlers/razorpay/payment-failed.handler';
import { RefundProcessedHandler } from './handlers/razorpay/refund-processed.handler';
import { GenericWebhookProcessor } from './processors/generic-webhook.processor';
import { GithubWebhookProcessor } from './processors/github-webhook.processor';
import { OutgoingWebhookProcessor } from './processors/outgoing-webhook.processor';
import { RazorpayWebhookProcessor } from './processors/razorpay-webhook.processor';
import { SignatureVerifierService } from './services/signature-verifier.service';
import { WebhookLoggerService } from './services/webhook-logger.service';
import { WebhookWorkerService } from './services/webhook-worker.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    NestConfigModule.forFeature(webhookConfig),
    HttpModule,
    DatabaseModule.forRoot(),
    CacheModule.forRoot(),
    QueueModule.forRoot(),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
  ],
  providers: [
    WebhookWorkerService,
    SignatureVerifierService,
    WebhookLoggerService,
    WebhookConsumer,
    OutgoingWebhookProcessor,
    RazorpayWebhookProcessor,
    GithubWebhookProcessor,
    GenericWebhookProcessor,
    PaymentCapturedHandler,
    PaymentFailedHandler,
    RefundProcessedHandler,
    DisputeCreatedHandler,
    PaymentCompletionService,
    GithubPushHandler,
    GithubPullRequestHandler,
    GithubDeploymentHandler,
  ],
})
export class AppModule {}
