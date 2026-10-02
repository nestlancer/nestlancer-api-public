import { WebhookRetryService } from '../../../src/services/webhook-retry.service';

describe('WebhookRetryService', () => {
  let service: WebhookRetryService;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = { get: jest.fn().mockReturnValue(5) };
    service = new WebhookRetryService(mockConfigService);
  });

  describe('calculateNextRetry', () => {
    it('should return 1 minute delay for 0 attempts', () => {
      const result = service.calculateNextRetry(0);
      const expected = Date.now() + 1 * 60 * 1000;
      expect(result.getTime()).toBeCloseTo(expected, -3);
    });

    it('should return 5 minute delay for 1 attempt', () => {
      const result = service.calculateNextRetry(1);
      const expected = Date.now() + 5 * 60 * 1000;
      expect(result.getTime()).toBeCloseTo(expected, -3);
    });

    it('should increase delay with more attempts', () => {
      const retry1 = service.calculateNextRetry(1);
      const retry3 = service.calculateNextRetry(3);
      expect(retry3.getTime()).toBeGreaterThan(retry1.getTime());
    });
  });

  describe('isMaxRetriesReached', () => {
    it('should return false for attempts below max', () => {
      expect(service.isMaxRetriesReached(3)).toBe(false);
    });

    it('should return true for attempts at or above max', () => {
      expect(service.isMaxRetriesReached(5)).toBe(true);
    });
  });
});
