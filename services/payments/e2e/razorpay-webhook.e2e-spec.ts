import * as crypto from 'crypto';
import request from 'supertest';
import { setupApp, teardownApp, getApp, getGlobalPrefix } from './setup';

const prefix = getGlobalPrefix();

function basePath() {
  return getApp().getHttpServer();
}

function computeWebhookSignature(rawBody: string): string {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mockwebhooksecret';
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

describe('Payments Service - Razorpay Webhook (E2E)', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('POST /webhooks/razorpay', () => {
    it('returns 400 when x-razorpay-signature is missing', async () => {
      const payload = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } },
      };
      const res = await request(basePath())
        .post(`/${prefix}/webhooks/razorpay`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(400);

      expect(res.body?.status).toBe('error');
      expect(res.body?.error?.message ?? res.body?.message).toBeDefined();
    });

    it('returns 400 when signature is invalid', async () => {
      const payload = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_1', order_id: 'order_1' } } },
      };
      const res = await request(basePath())
        .post(`/${prefix}/webhooks/razorpay`)
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', 'invalid-signature')
        .send(payload)
        .expect(400);

      expect(res.body?.status).toBe('error');
    });

    it('returns 200 and data.received true when signature is valid', async () => {
      const payload = {
        event: 'payment.captured',
        payload: { payment: { entity: { id: 'pay_e2e_1', order_id: 'order_e2e_123' } } },
      };
      const rawBody = JSON.stringify(payload);
      const signature = computeWebhookSignature(rawBody);

      const res = await request(basePath())
        .post(`/${prefix}/webhooks/razorpay`)
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(payload)
        .expect(200);

      expect(res.body?.data?.received).toBe(true);
    });
  });
});
