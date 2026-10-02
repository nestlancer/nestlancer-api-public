import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../../src/app.module';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { LoggerService } from '@nestlancer/logger';
import { WebhookWorkerService } from '../../src/services/webhook-worker.service';
import { SignatureVerifierService } from '../../src/services/signature-verifier.service';
import { WebhookLoggerService } from '../../src/services/webhook-logger.service';
import { WebhookConsumer } from '../../src/consumers/webhook.consumer';
import { OutgoingWebhookProcessor } from '../../src/processors/outgoing-webhook.processor';
import { RazorpayWebhookProcessor } from '../../src/processors/razorpay-webhook.processor';
import { GithubWebhookProcessor } from '../../src/processors/github-webhook.processor';
import { GenericWebhookProcessor } from '../../src/processors/generic-webhook.processor';
import { PaymentCapturedHandler } from '../../src/handlers/razorpay/payment-captured.handler';
import { PaymentFailedHandler } from '../../src/handlers/razorpay/payment-failed.handler';
import { RefundProcessedHandler } from '../../src/handlers/razorpay/refund-processed.handler';
import { DisputeCreatedHandler } from '../../src/handlers/razorpay/dispute-created.handler';
import { GithubPushHandler } from '../../src/handlers/github/push.handler';
import { GithubPullRequestHandler } from '../../src/handlers/github/pull-request.handler';
import { GithubDeploymentHandler } from '../../src/handlers/github/deployment.handler';

describe('AppModule (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(QueuePublisherService)
      .useValue({ publish: jest.fn() })
      .overrideProvider(QueueConsumerService)
      .useValue({ consume: jest.fn(), getChannel: jest.fn(), onModuleInit: jest.fn() })
      .overrideProvider(DlqService)
      .useValue({})
      .overrideProvider(PrismaWriteService)
      .useValue({
        payment: { findFirst: jest.fn(), update: jest.fn() },
        refund: { findFirst: jest.fn() },
        dispute: { create: jest.fn() },
        webhookLog: { update: jest.fn() },
        webhookDelivery: { create: jest.fn() },
        $transaction: jest.fn(),
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .overrideProvider(PrismaReadService)
      .useValue({
        webhook: { findUnique: jest.fn() },
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .overrideProvider(LoggerService)
      .useValue({ log: jest.fn(), error: jest.fn(), warn: jest.fn() })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Configuration & Dependencies', () => {
    it('should initialize the worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule dependencies', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });

    it('should load webhook configuration', () => {
      const configService = app.get(ConfigService);
      expect(configService).toBeDefined();
      const webhookConfig = configService.get('webhook-worker');
      expect(webhookConfig).toBeDefined();
    });

    it('should resolve all webhook providers and handlers', () => {
      const providers = [
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
        GithubPushHandler,
        GithubPullRequestHandler,
        GithubDeploymentHandler,
      ];

      for (const provider of providers) {
        const instance = app.get(provider);
        expect(instance).toBeDefined();
      }
    });
  });
});
