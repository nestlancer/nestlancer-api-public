import { Test, TestingModule } from '@nestjs/testing';
import { RazorpayProvider } from '../../../src/providers/razorpay.provider';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

describe('RazorpayProvider', () => {
  let provider: RazorpayProvider;
  const secret = 'test-secret';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'webhooks.razorpaySecret') return secret;
              return null;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<RazorpayProvider>(RazorpayProvider);
  });

  describe('verifySignature', () => {
    it('should return true for valid signature', () => {
      const payload = '{"event":"payment.captured"}';
      const rawBody = Buffer.from(payload);
      const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      const headers = { 'x-razorpay-signature': signature };
      const result = provider.verifySignature(rawBody, headers);
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const rawBody = Buffer.from('{"event":"payment.failed"}');
      const headers = { 'x-razorpay-signature': 'invalid-sig' };
      const result = provider.verifySignature(rawBody, headers);
      expect(result).toBe(false);
    });
  });

  describe('parseEvent', () => {
    it('should parse payment event correctly', () => {
      const payload = {
        event: 'payment.captured',
        created_at: Math.floor(Date.now() / 1000),
      };
      const headers = { 'x-razorpay-event-id': 'evt_test123' };

      const event = provider.parseEvent(payload, headers);

      expect(event.provider).toBe('razorpay');
      expect(event.eventType).toBe('payment.captured');
      expect(event.eventId).toBe('evt_test123');
      expect(event.targetQueue).toBe('payments.webhook.queue');
    });
  });
});
