jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: { create: jest.fn(), fetch: jest.fn() },
    payments: { fetch: jest.fn(), refund: jest.fn() },
  }));
});

import { RazorpayService } from '../../../src/services/razorpay.service';

describe('RazorpayService', () => {
  let service: RazorpayService;
  let mockConfig: any;

  beforeEach(() => {
    mockConfig = {
      razorpayKeyId: 'test_key_id',
      razorpayKeySecret: 'test_key_secret',
      razorpayWebhookSecret: 'test_webhook_secret',
    };
    service = new RazorpayService(mockConfig);
  });

  describe('createOrder', () => {
    it('should create an order with amount in subunits', async () => {
      const spy = jest
        .spyOn((service as any).instance.orders, 'create')
        .mockResolvedValue({ id: 'order_123' });
      const result = await service.createOrder(5000, 'INR', 'rcpt_1');
      expect(result.id).toBe('order_123');
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ amount: 5000, currency: 'INR' }));
    });

    it('should throw when Razorpay API fails', async () => {
      jest
        .spyOn((service as any).instance.orders, 'create')
        .mockRejectedValue(new Error('API error'));
      await expect(service.createOrder(5000, 'INR', 'rcpt_1')).rejects.toThrow();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify a valid webhook signature', () => {
      const crypto = require('crypto');
      const body = '{"test":"data"}';
      const expectedSig = crypto
        .createHmac('sha256', 'test_webhook_secret')
        .update(body)
        .digest('hex');
      expect(service.verifyWebhookSignature(body, expectedSig)).toBe(true);
    });

    it('should reject an invalid webhook signature', () => {
      expect(service.verifyWebhookSignature('body', 'invalid_signature')).toBe(false);
    });
  });

  describe('verifyPaymentSignature', () => {
    it('should verify a valid payment signature', () => {
      const crypto = require('crypto');
      const text = 'order_123|pay_456';
      const expectedSig = crypto.createHmac('sha256', 'test_key_secret').update(text).digest('hex');
      expect(service.verifyPaymentSignature('order_123', 'pay_456', expectedSig)).toBe(true);
    });
  });
});
