import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { WebhookWorkerService } from '../../src/services/webhook-worker.service';
import { WebhookConsumer } from '../../src/consumers/webhook.consumer';
import { OutgoingWebhookProcessor } from '../../src/processors/outgoing-webhook.processor';
import { RazorpayWebhookProcessor } from '../../src/processors/razorpay-webhook.processor';
import { GithubWebhookProcessor } from '../../src/processors/github-webhook.processor';
import { GenericWebhookProcessor } from '../../src/processors/generic-webhook.processor';
import { QueuePublisherService, QueueConsumerService, DlqService } from '@nestlancer/queue';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

function loadDevEnv() {
  const envPath = resolve(__dirname, '../../../../.env.development');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...value] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = value
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });
}

describe('Webhook Worker (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

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
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        payment: { findFirst: jest.fn(), update: jest.fn() },
        refund: { findFirst: jest.fn() },
        dispute: { create: jest.fn() },
        webhookLog: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn() },
        webhookDelivery: { create: jest.fn() },
        $transaction: jest.fn(),
      })
      .overrideProvider(PrismaReadService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        webhook: { findUnique: jest.fn(), findMany: jest.fn() },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Module Initialization', () => {
    it('should initialize the webhook worker application context successfully', () => {
      expect(app).toBeDefined();
    });

    it('should resolve AppModule', () => {
      const appModule = app.get(AppModule);
      expect(appModule).toBeDefined();
    });
  });

  describe('Service Resolution', () => {
    it('should resolve WebhookWorkerService', () => {
      const service = app.get(WebhookWorkerService);
      expect(service).toBeDefined();
    });

    it('should resolve WebhookConsumer', () => {
      const consumer = app.get(WebhookConsumer);
      expect(consumer).toBeDefined();
    });

    it('should resolve OutgoingWebhookProcessor', () => {
      const processor = app.get(OutgoingWebhookProcessor);
      expect(processor).toBeDefined();
    });

    it('should resolve RazorpayWebhookProcessor', () => {
      const processor = app.get(RazorpayWebhookProcessor);
      expect(processor).toBeDefined();
    });

    it('should resolve GithubWebhookProcessor', () => {
      const processor = app.get(GithubWebhookProcessor);
      expect(processor).toBeDefined();
    });

    it('should resolve GenericWebhookProcessor', () => {
      const processor = app.get(GenericWebhookProcessor);
      expect(processor).toBeDefined();
    });
    describe('WebhookWorkerService Logic', () => {
      let service: WebhookWorkerService;

      beforeEach(() => {
        service = app.get(WebhookWorkerService);
      });

      it('should throw ResourceNotFoundException for unknown provider/eventType', async () => {
        await expect(
          service.dispatch('unknown_provider', 'unknown_event', {}),
        ).rejects.toThrowError(/WebhookHandler/);
      });
    });

    describe('WebhookConsumer Logic', () => {
      let consumer: WebhookConsumer;
      let service: WebhookWorkerService;
      let queueConsumer: QueueConsumerService;
      let prisma: PrismaWriteService;

      beforeEach(() => {
        consumer = app.get(WebhookConsumer);
        service = app.get(WebhookWorkerService);
        queueConsumer = app.get(QueueConsumerService);
        prisma = app.get(PrismaWriteService);

        (queueConsumer.consume as jest.Mock).mockClear();
      });

      it('should parse message and dispatch to WebhookWorkerService', async () => {
        jest.spyOn(service, 'dispatch').mockResolvedValue(undefined);
        (prisma.webhookLog.update as jest.Mock).mockResolvedValue(undefined);

        await consumer.onModuleInit();

        const consumeCalls = (queueConsumer.consume as jest.Mock).mock.calls;
        const callback = consumeCalls[0][1]; // first queue callback

        const payload = {
          provider: 'razorpay',
          eventType: 'payment.captured',
          rawPayloadId: 'log-1',
          data: { id: 'pay_123' },
        };

        const msg: any = { content: Buffer.from(JSON.stringify(payload)) };

        await callback(msg);

        expect(service.dispatch).toHaveBeenCalledWith('razorpay', 'payment.captured', {
          id: 'pay_123',
        });
        expect(prisma.webhookLog.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'log-1' },
            data: expect.objectContaining({ status: 'PROCESSED' }),
          }),
        );
      });

      it('should throw error for invalid JSON payload', async () => {
        await consumer.onModuleInit();
        const consumeCalls = (queueConsumer.consume as jest.Mock).mock.calls;
        const callback = consumeCalls[0][1];

        const msg: any = { content: Buffer.from('invalid-json') };

        await expect(callback(msg)).rejects.toThrow();
      });
    });
  });
});
