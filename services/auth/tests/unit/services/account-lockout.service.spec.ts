import { AccountLockoutService } from '../../../src/services/account-lockout.service';
import { RateLimitException } from '@nestlancer/common';

describe('AccountLockoutService', () => {
  let service: AccountLockoutService;
  let mockPrismaRead: any;
  let mockPrismaWrite: any;
  let mockConfig: any;

  beforeEach(() => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.AUTH_IP_FAIL_LIMIT = '5';
    process.env.AUTH_IP_FAIL_WINDOW_MS = '60000';
    process.env.MAX_FAILED_LOGIN_ATTEMPTS = '5';
    process.env.LOCKOUT_DURATION_MS = '1800000';
    mockPrismaRead = {
      authConfig: {
        findUnique: jest.fn().mockResolvedValue({
          failedLoginAttempts: 0,
          lockoutUntil: null,
        }),
      },
    };
    mockPrismaWrite = {
      authConfig: {
        upsert: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, any> = {
          'authService.security.maxFailedAttempts': 5,
          'authService.security.lockoutDurationMs': 1800000,
        };
        return config[key];
      }),
    };

    service = new AccountLockoutService(mockPrismaRead, mockPrismaWrite, mockConfig);
  });

  afterEach(() => {
    delete process.env.RATE_LIMIT_ENABLED;
    delete process.env.AUTH_IP_FAIL_LIMIT;
    delete process.env.AUTH_IP_FAIL_WINDOW_MS;
    delete process.env.MAX_FAILED_LOGIN_ATTEMPTS;
    delete process.env.LOCKOUT_DURATION_MS;
  });

  describe('checkLockout', () => {
    it('should pass when user is not locked', async () => {
      await expect(service.checkLockout('user-1')).resolves.toBeUndefined();
    });

    it('should throw RateLimitException when user is locked', async () => {
      mockPrismaRead.authConfig.findUnique.mockResolvedValue({
        lockoutUntil: new Date(Date.now() + 60000),
      });

      await expect(service.checkLockout('user-1')).rejects.toThrow(RateLimitException);
    });

    it('should pass when lockout has expired', async () => {
      mockPrismaRead.authConfig.findUnique.mockResolvedValue({
        lockoutUntil: new Date(Date.now() - 60000), // expired
      });

      await expect(service.checkLockout('user-1')).resolves.toBeUndefined();
    });

    it('should pass when no auth config exists', async () => {
      mockPrismaRead.authConfig.findUnique.mockResolvedValue(null);

      await expect(service.checkLockout('user-1')).resolves.toBeUndefined();
    });

    it('should skip lockout when RATE_LIMIT_ENABLED=false', async () => {
      process.env.RATE_LIMIT_ENABLED = 'false';
      mockPrismaRead.authConfig.findUnique.mockResolvedValue({
        lockoutUntil: new Date(Date.now() + 60000),
      });

      await expect(service.checkLockout('user-1')).resolves.toBeUndefined();
    });

    it('should skip lockout when RATE_LIMIT_ENABLED is Infisical-quoted false', async () => {
      process.env.RATE_LIMIT_ENABLED = "'false'";
      mockPrismaRead.authConfig.findUnique.mockResolvedValue({
        lockoutUntil: new Date(Date.now() + 60000),
      });

      await expect(service.checkLockout('user-1')).resolves.toBeUndefined();
    });
  });

  describe('recordIpFailure', () => {
    it('should no-op when RATE_LIMIT_ENABLED=false', async () => {
      process.env.RATE_LIMIT_ENABLED = 'false';
      process.env.AUTH_IP_FAIL_LIMIT = '1';
      await expect(service.recordIpFailure('1.2.3.4')).resolves.toBeUndefined();
      await expect(service.recordIpFailure('1.2.3.4')).resolves.toBeUndefined();
    });

    it('should honor quoted AUTH_IP_FAIL_LIMIT sentinel', async () => {
      process.env.RATE_LIMIT_ENABLED = 'true';
      process.env.AUTH_IP_FAIL_LIMIT = "'10000'";
      // 6 fails must NOT trip if sentinel parses as 10000 (quoted bug used to fall back to 5)
      for (let i = 0; i < 6; i++) {
        await expect(service.recordIpFailure('9.9.9.9')).resolves.toBeUndefined();
      }
    });
  });

  describe('handleFailedAttempt', () => {
    it('should increment failed attempts and return remaining', async () => {
      const result = await service.handleFailedAttempt('user-1', { failedLoginAttempts: 2 });
      expect(result).toBe(2); // 5 max - 3 current = 2 remaining
      expect(mockPrismaWrite.authConfig.upsert).toHaveBeenCalled();
    });

    it('should lock account after max attempts with HTTP 429', async () => {
      await expect(
        service.handleFailedAttempt('user-1', { failedLoginAttempts: 4 }),
      ).rejects.toThrow(RateLimitException);
    });

    it('should return 0 if already locked', async () => {
      const result = await service.handleFailedAttempt('user-1', {
        failedLoginAttempts: 5,
        lockoutUntil: new Date(Date.now() + 60000),
      });
      expect(result).toBe(0);
    });

    it('should handle null authConfig', async () => {
      const result = await service.handleFailedAttempt('user-1', null);
      expect(result).toBe(4); // 5 max - 1 attempt = 4 remaining
    });

    it('should use default maxAttempts of 5', async () => {
      delete process.env.MAX_FAILED_LOGIN_ATTEMPTS;
      mockConfig.get.mockReturnValue(undefined);
      const result = await service.handleFailedAttempt('user-1', { failedLoginAttempts: 0 });
      expect(result).toBe(4);
    });
  });

  describe('resetFailedAttempts', () => {
    it('should reset failed attempts', async () => {
      await service.resetFailedAttempts('user-1');
      expect(mockPrismaWrite.authConfig.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', failedLoginAttempts: { gt: 0 } },
        data: {
          failedLoginAttempts: 0,
          lockoutUntil: null,
        },
      });
    });
  });
});
