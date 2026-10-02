jest.mock('otplib', () => ({
  authenticator: {
    options: {},
    verify: jest.fn(),
  },
}));

import { createHash } from 'crypto';
import { authenticator } from 'otplib';
import { TwoFactorService } from '../../../src/services/two-factor.service';

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let mockPrismaRead: any;
  let mockPrismaWrite: any;
  let mockTokenService: any;
  let mockLockoutService: any;

  const hashCode = (code: string) => createHash('sha256').update(code).digest('hex');

  const mockSession = {
    id: 'sess2Fa_abc123',
    userId: 'user-1',
    type: '2FA_PENDING',
    ipAddress: '127.0.0.1',
    userAgent: 'TestAgent',
    expiresAt: new Date(Date.now() + 600000),
    user: {
      id: 'user-1',
      email: 'test@example.com',
      authConfig: {
        twoFactorSecret: 'totp-secret',
        backupCodes: [
          { hash: hashCode('BACKUP01'), used: false },
          { hash: hashCode('BACKUP02'), used: false },
          { hash: hashCode('BACKUP03'), used: false },
        ],
      },
    },
  };

  beforeEach(() => {
    mockPrismaRead = {
      authSession: {
        findUnique: jest.fn().mockResolvedValue(structuredClone(mockSession)),
      },
    };
    mockPrismaWrite = {
      authSession: {
        delete: jest.fn().mockResolvedValue({}),
      },
      authConfig: {
        update: jest.fn().mockResolvedValue({}),
      },
    };
    mockTokenService = {
      generateAuthTokens: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
      }),
    };
    mockLockoutService = {
      handleFailedAttempt: jest.fn().mockResolvedValue(3),
      resetFailedAttempts: jest.fn().mockResolvedValue(undefined),
    };

    service = new TwoFactorService(
      mockPrismaRead,
      mockPrismaWrite,
      mockTokenService,
      mockLockoutService,
    );
  });

  describe('verify2FA', () => {
    it('should verify TOTP code successfully', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      const result = await service.verify2FA('sess2Fa_abc123', '123456', 'totp');
      expect(result.accessToken).toBe('access-token');
      expect(mockLockoutService.resetFailedAttempts).toHaveBeenCalledWith('user-1');
      expect(mockPrismaWrite.authSession.delete).toHaveBeenCalledWith({
        where: { id: 'sess2Fa_abc123' },
      });
    });

    it('should throw for invalid TOTP code', async () => {
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      await expect(service.verify2FA('sess2Fa_abc123', '000000', 'totp')).rejects.toThrow();
      expect(mockLockoutService.handleFailedAttempt).toHaveBeenCalled();
    });

    it('should verify hashed backup code and mark it used', async () => {
      const result = await service.verify2FA('sess2Fa_abc123', 'BACKUP01', 'backupCode');
      expect(result.accessToken).toBe('access-token');
      expect(mockPrismaWrite.authConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          data: {
            backupCodes: [
              { hash: hashCode('BACKUP01'), used: true },
              { hash: hashCode('BACKUP02'), used: false },
              { hash: hashCode('BACKUP03'), used: false },
            ],
          },
        }),
      );
    });

    it('should still support legacy plaintext backup codes', async () => {
      mockPrismaRead.authSession.findUnique.mockResolvedValue({
        ...mockSession,
        user: {
          ...mockSession.user,
          authConfig: {
            ...mockSession.user.authConfig,
            backupCodes: ['backup1', 'backup2', 'backup3'],
          },
        },
      });

      const result = await service.verify2FA('sess2Fa_abc123', 'backup1', 'backupCode');
      expect(result.accessToken).toBe('access-token');
      expect(mockPrismaWrite.authConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { backupCodes: ['backup2', 'backup3'] },
        }),
      );
    });

    it('should throw for invalid backup code', async () => {
      await expect(
        service.verify2FA('sess2Fa_abc123', 'invalid_code', 'backupCode'),
      ).rejects.toThrow();
    });

    it('should throw for expired session', async () => {
      mockPrismaRead.authSession.findUnique.mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 60000),
      });

      await expect(service.verify2FA('sess2Fa_abc123', '123456', 'totp')).rejects.toThrow();
      expect(mockPrismaWrite.authSession.delete).toHaveBeenCalled();
    });

    it('should throw for invalid or missing session', async () => {
      mockPrismaRead.authSession.findUnique.mockResolvedValue(null);

      await expect(service.verify2FA('invalid-session', '123456', 'totp')).rejects.toThrow();
    });

    it('should throw for wrong session type', async () => {
      mockPrismaRead.authSession.findUnique.mockResolvedValue({
        ...mockSession,
        type: 'ACTIVE',
      });

      await expect(service.verify2FA('sess2Fa_abc123', '123456', 'totp')).rejects.toThrow();
    });
  });
});
