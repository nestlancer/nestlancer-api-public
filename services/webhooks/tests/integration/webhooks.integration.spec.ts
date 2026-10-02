import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as crypto from 'crypto';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter, TransformResponseInterceptor } from '@nestlancer/common';
import { AppModule } from '../../src/app.module';
import { QueuePublisherService, QueueConsumerService } from '@nestlancer/queue';
import { ConfigService } from '@nestjs/config';
import { PrismaWriteService } from '@nestlancer/database';

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

const basePath = '/api/v1/webhooks';
const RAZORPAY_SECRET = 'test-razorpay-secret';
const CLOUDFLARE_SECRET = 'test-cloudflare-secret';

describe('Webhooks Service (Integration)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'test';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: jest.fn((key: string) => {
          if (key === 'webhooks.razorpaySecret') return RAZORPAY_SECRET;
          if (key === 'webhooks.cloudflareSecret') return CLOUDFLARE_SECRET;
          return undefined;
        }),
      })
      .overrideProvider(PrismaWriteService)
      .useValue({
        webhookLog: {
          create: jest.fn().mockResolvedValue({
            id: 'log-1',
            provider: 'razorpay',
            status: 'PENDING',
            eventType: 'payment.captured',
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      })
      .overrideProvider(QueuePublisherService)
      .useValue({
        publish: jest.fn().mockResolvedValue(undefined),
        sendToQueue: jest.fn().mockResolvedValue(undefined),
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
      })
      .overrideProvider(QueueConsumerService)
      .useValue({
        consume: jest.fn().mockResolvedValue(undefined),
        getChannel: jest.fn(),
        onModuleInit: jest.fn(),
      })
      .overrideProvider('QUEUE_OPTIONS')
      .useValue({ url: 'amqp://localhost:5672' })
      .compile();

    app = moduleRef.createNestApplication({
      rawBody: true,
    });

    app.setGlobalPrefix('api/v1/webhooks');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health', () => {
    it(`GET ${basePath}/health - should return 200 with status ok and service webhooks-inbound`, async () => {
      const response = await request(app.getHttpServer()).get(`${basePath}/health`);

      expect(response.status).toBe(200);
      const healthData = response.body?.data ?? response.body;
      expect(healthData).toBeDefined();
      expect(healthData.status).toBe('ok');
      expect(healthData.service).toBe('webhooks-inbound');
    });
  });

  describe('Supported providers (razorpay, cloudflare)', () => {
    it('POST /api/v1/webhooks/razorpay - should return 401 when signature is missing', async () => {
      const payload = {
        entity: 'event',
        event: 'payment.captured',
        created_at: Math.floor(Date.now() / 1000),
        contains: ['payment'],
        payload: { payment: { entity: { id: 'pay_test123' } } },
      };
      const response = await request(app.getHttpServer())
        .post(`${basePath}/razorpay`)
        .set('Content-Type', 'application/json')
        .send(payload);

      expect(response.status).toBe(401);
      expect(response.body?.error?.message || response.body?.message).toMatch(/signature|invalid/i);
    });

    it('POST /api/v1/webhooks/razorpay - should return 401 when signature is invalid', async () => {
      const rawBody = JSON.stringify({
        entity: 'event',
        event: 'payment.captured',
        created_at: Math.floor(Date.now() / 1000),
        contains: ['payment'],
        payload: { payment: { entity: { id: 'pay_test123' } } },
      });
      const response = await request(app.getHttpServer())
        .post(`${basePath}/razorpay`)
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Signature', 'invalid-signature')
        .send(rawBody);

      expect(response.status).toBe(401);
    });

    it('POST /api/v1/webhooks/razorpay - should return 200 when signature is valid and payload is valid JSON', async () => {
      const payload = {
        entity: 'event',
        event: 'payment.captured',
        created_at: Math.floor(Date.now() / 1000),
        contains: ['payment'],
        payload: { payment: { entity: { id: 'pay_test123' } } },
      };
      const rawBody = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', RAZORPAY_SECRET).update(rawBody).digest('hex');

      const response = await request(app.getHttpServer())
        .post(`${basePath}/razorpay`)
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Signature', signature)
        .send(rawBody);

      expect(response.status).toBe(200);
    });

    it('POST /api/v1/webhooks/razorpay - should return 422 or 400 when body is not valid JSON', async () => {
      const rawBody = 'not valid json';
      const signature = crypto.createHmac('sha256', RAZORPAY_SECRET).update(rawBody).digest('hex');

      const response = await request(app.getHttpServer())
        .post(`${basePath}/razorpay`)
        .set('Content-Type', 'application/json')
        .set('X-Razorpay-Signature', signature)
        .send(rawBody);

      // 422 from our UnprocessableEntityException, or 400 if body parser rejects invalid JSON first
      expect([400, 422]).toContain(response.status);
    });

    it('POST /api/v1/webhooks/cloudflare - should return 401 when signature is missing', async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/cloudflare`)
        .set('Content-Type', 'application/json')
        .send({ action: 'alert', alert_name: 'Test', metadata: {} });

      expect(response.status).toBe(401);
    });

    it('POST /api/v1/webhooks/cloudflare - should return 200 when cf-webhook-auth matches secret', async () => {
      const payload = { action: 'alert', alert_name: 'Test', metadata: {} };
      const response = await request(app.getHttpServer())
        .post(`${basePath}/cloudflare`)
        .set('Content-Type', 'application/json')
        .set('cf-webhook-auth', CLOUDFLARE_SECRET)
        .send(payload);

      expect(response.status).toBe(200);
    });
  });

  describe('Unsupported providers', () => {
    it('POST /api/v1/webhooks/github - should return 400 with provider not supported', async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/github`)
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .send({ repository: { full_name: 'test/repo' }, action: 'opened' });

      expect(response.status).toBe(400);
      const message = response.body?.error?.message ?? response.body?.message ?? '';
      expect(message).toMatch(/not supported|github/i);
    });

    it('POST /api/v1/webhooks/stripe - should return 400 with provider not supported', async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/stripe`)
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 'test-signature')
        .send({ type: 'payment_intent.succeeded', data: { object: {} } });

      expect(response.status).toBe(400);
      const message = response.body?.error?.message ?? response.body?.message ?? '';
      expect(message).toMatch(/not supported|stripe/i);
    });

    it('POST /api/v1/webhooks/:provider - should return 400 for dynamic unsupported provider', async () => {
      const response = await request(app.getHttpServer())
        .post(`${basePath}/custom-provider`)
        .set('Content-Type', 'application/json')
        .send({ event: 'test', data: {} });

      expect(response.status).toBe(400);
      const message = response.body?.error?.message ?? response.body?.message ?? '';
      expect(message).toMatch(/not supported|custom-provider/i);
    });
  });
});
