import {
  setupApp,
  teardownApp,
  getApp,
  getConsumeHandler,
  getWebhookLogUpdateMock,
  getPaymentFindFirstMock,
  getPaymentUpdateMock,
  getQueuePublishMock,
} from './setup';
import { WebhookConsumer } from '../src/consumers/webhook.consumer';
import { WebhookWorkerService } from '../src/services/webhook-worker.service';
import { ResourceNotFoundException } from '@nestlancer/common';
import { PaymentCapturedHandler } from '../src/handlers/razorpay/payment-captured.handler';
import { GithubPushHandler } from '../src/handlers/github/push.handler';

describe('Webhook Worker - E2E', () => {
  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Health (smoke)', () => {
    it('should bootstrap worker and resolve key services', () => {
      const app = getApp();
      expect(app).toBeDefined();
      expect(app.get(WebhookConsumer)).toBeDefined();
      expect(app.get(WebhookWorkerService)).toBeDefined();
      expect(app.get(PaymentCapturedHandler)).toBeDefined();
      expect(app.get(GithubPushHandler)).toBeDefined();
    });
  });

  describe('WebhookWorkerService - dispatch (E2E)', () => {
    let service: WebhookWorkerService;

    beforeAll(() => {
      service = getApp().get(WebhookWorkerService);
    });

    it('should run handler and resolve when provider:eventType is github:push', async () => {
      await expect(
        service.dispatch('github', 'push', { repository: { full_name: 'org/repo' } }),
      ).resolves.toBeUndefined();
    });

    it('should throw ResourceNotFoundException when no handler exists for provider:eventType', async () => {
      await expect(service.dispatch('unknown', 'unknown.event', {})).rejects.toThrow(
        ResourceNotFoundException,
      );
      await expect(service.dispatch('unknown', 'unknown.event', {})).rejects.toMatchObject({
        message: expect.stringContaining('WebhookHandler'),
      });
    });

    it('should update payment and publish notification when razorpay:payment.captured and payment exists', async () => {
      const paymentFindFirstMock = getPaymentFindFirstMock();
      const paymentUpdateMock = getPaymentUpdateMock();
      const queuePublishMock = getQueuePublishMock();

      paymentFindFirstMock.mockReset();
      paymentUpdateMock.mockReset();
      queuePublishMock.mockReset();

      const payment = {
        id: 'pay-e2e-1',
        clientId: 'usr-e2e-1',
        amount: 100,
        status: 'PENDING',
        externalId: 'rp_pay_e2e_123',
      };
      paymentFindFirstMock.mockResolvedValueOnce(payment);
      paymentUpdateMock.mockResolvedValueOnce({ ...payment, status: 'COMPLETED' });

      await service.dispatch('razorpay', 'payment.captured', {
        payment: { entity: { id: 'rp_pay_e2e_123' } },
      });

      expect(paymentFindFirstMock).toHaveBeenCalledTimes(1);
      expect(paymentFindFirstMock).toHaveBeenCalledWith({
        where: { externalId: 'rp_pay_e2e_123' },
      });
      expect(paymentUpdateMock).toHaveBeenCalledTimes(1);
      expect(paymentUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pay-e2e-1' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
      expect(queuePublishMock).toHaveBeenCalledTimes(1);
      expect(queuePublishMock).toHaveBeenCalledWith('events', 'notification.payment.completed', {
        type: 'payment.completed',
        userId: 'usr-e2e-1',
        payload: { paymentId: 'pay-e2e-1', amount: 100 },
      });
    });
  });

  describe('WebhookConsumer - message handling (E2E)', () => {
    const webhookLogUpdateMock = getWebhookLogUpdateMock();

    beforeEach(() => {
      webhookLogUpdateMock.mockClear();
    });

    it('should parse valid message, dispatch, and mark webhook log PROCESSED', async () => {
      const rawPayloadId = 'log-e2e-processed-1';
      const body = {
        provider: 'github',
        eventType: 'push',
        rawPayloadId,
        data: { repository: { full_name: 'org/repo' } },
      };
      const msg = { content: Buffer.from(JSON.stringify(body)) };

      const handler = getConsumeHandler();
      await handler(msg);

      expect(webhookLogUpdateMock).toHaveBeenCalledTimes(1);
      expect(webhookLogUpdateMock).toHaveBeenCalledWith({
        where: { id: rawPayloadId },
        data: expect.objectContaining({ status: 'PROCESSED' }),
      });
    });

    it('should reject on invalid JSON and not mark webhook log PROCESSED', async () => {
      const msg = { content: Buffer.from('not valid json {{{') };

      const handler = getConsumeHandler();
      await expect(handler(msg)).rejects.toThrow();

      const processedCalls = webhookLogUpdateMock.mock.calls.filter(
        (call) => call[0]?.data?.status === 'PROCESSED',
      );
      expect(processedCalls).toHaveLength(0);
    });

    it('should return early without updating webhook log when provider or eventType or rawPayloadId missing', async () => {
      const body = { provider: 'github', eventType: 'push' }; // no rawPayloadId
      const msg = { content: Buffer.from(JSON.stringify(body)) };

      const handler = getConsumeHandler();
      await handler(msg);

      expect(webhookLogUpdateMock).not.toHaveBeenCalled();
    });

    it('should mark webhook log FAILED after retries when dispatch keeps throwing', async () => {
      const rawPayloadId = 'log-e2e-failed-1';
      const body = {
        provider: 'unknown',
        eventType: 'unknown.event',
        rawPayloadId,
        data: {},
      };
      const msg = { content: Buffer.from(JSON.stringify(body)) };

      const handler = getConsumeHandler();
      await expect(handler(msg)).resolves.toBeUndefined();

      const failedUpdate = webhookLogUpdateMock.mock.calls.find(
        (call) => call[0]?.data?.status === 'FAILED',
      );
      expect(failedUpdate).toBeDefined();
      expect(failedUpdate![0]).toMatchObject({
        where: { id: rawPayloadId },
        data: expect.objectContaining({ status: 'FAILED' }),
      });
    });
  });
});
