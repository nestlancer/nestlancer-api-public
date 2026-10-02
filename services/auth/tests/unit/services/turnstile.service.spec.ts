import { TurnstileService } from '../../../src/services/turnstile.service';
import { BusinessLogicException } from '@nestlancer/common';

describe('TurnstileService', () => {
  let service: TurnstileService;
  let mockConfigService: any;
  let mockLogger: any;
  let originalFetch: typeof global.fetch;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalEnv = process.env.NODE_ENV;

    mockConfigService = {
      getOptional: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, any> = {
          'authService.turnstile.secretKey': 'test-secret-key',
          'authService.turnstile.bypassToken': 'bypass-token',
        };
        return config[key];
      }),
    };
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    // Set NODE_ENV to something other than 'test' so turnstile doesn't auto-pass
    process.env.NODE_ENV = 'development';
    service = new TurnstileService(mockConfigService, mockLogger);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.NODE_ENV = originalEnv;
  });

  describe('isEnabled', () => {
    it('should be true when secret key is configured', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should be false when secret key is missing', () => {
      mockConfigService.getOptional.mockReturnValue(undefined);
      service = new TurnstileService(mockConfigService, mockLogger);
      expect(service.isEnabled()).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should throw for empty token when enabled', async () => {
      await expect(service.verifyToken('')).rejects.toThrow(BusinessLogicException);
    });

    it('should return true for bypass token', async () => {
      const result = await service.verifyToken('bypass-token');
      expect(result).toBe(true);
    });

    it('should return true in test environment', async () => {
      process.env.NODE_ENV = 'test';
      service = new TurnstileService(mockConfigService, mockLogger);

      const result = await service.verifyToken('any-token');
      expect(result).toBe(true);
    });

    it('should return true when secret key is missing (disabled)', async () => {
      mockConfigService.getOptional.mockImplementation((key: string) => {
        if (key === 'authService.turnstile.secretKey') return undefined;
        if (key === 'authService.turnstile.bypassToken') return undefined;
        return undefined;
      });
      service = new TurnstileService(mockConfigService, mockLogger);

      const result = await service.verifyToken('');
      expect(result).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should verify token successfully with Cloudflare', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest.fn().mockResolvedValue({ success: true }),
      }) as any;

      const result = await service.verifyToken('valid-token', '127.0.0.1');
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should throw for failed Cloudflare verification', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        json: jest
          .fn()
          .mockResolvedValue({ success: false, 'error-codes': ['invalid-input-response'] }),
      }) as any;

      await expect(service.verifyToken('invalid-token')).rejects.toThrow();
    });

    it('should throw when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as any;

      await expect(service.verifyToken('any-token')).rejects.toThrow();
    });
  });
});
