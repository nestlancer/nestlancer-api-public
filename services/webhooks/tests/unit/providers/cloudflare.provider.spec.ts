import { Test, TestingModule } from '@nestjs/testing';
import { CloudflareProvider } from '../../../src/providers/cloudflare.provider';
import { ConfigService } from '@nestjs/config';

describe('CloudflareProvider', () => {
  let provider: CloudflareProvider;
  const secret = 'cf-test-secret';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudflareProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'webhooks.cloudflareSecret') return secret;
              return null;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<CloudflareProvider>(CloudflareProvider);
  });

  describe('verifySignature', () => {
    it('should return true when secret matches', () => {
      const headers = { 'cf-webhook-auth': secret };
      const rawBody = Buffer.from('{}');

      expect(provider.verifySignature(rawBody, headers)).toBe(true);
    });

    it('should return false when secret does not match', () => {
      const headers = { 'cf-webhook-auth': 'wrong-secret' };
      const rawBody = Buffer.from('{}');

      expect(provider.verifySignature(rawBody, headers)).toBe(false);
    });
  });

  describe('parseEvent', () => {
    it('should parse correctly', () => {
      const payload = { type: 'cache.purge' };
      const headers = { 'cf-ray': 'ray-id-123' };

      const event = provider.parseEvent(payload, headers);

      expect(event.provider).toBe('cloudflare');
      expect(event.eventType).toBe('cache.purge');
      expect(event.eventId).toBe('ray-id-123');
      expect(event.targetQueue).toBe('system.webhook.queue');
    });
  });
});
