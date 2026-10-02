import { EmailVerificationService } from '../../../src/services/email-verification.service';

describe('EmailVerificationService', () => {
  let service: EmailVerificationService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockQueue: any;
  let mockConfig: any;

  const mockToken = {
    id: 'token-1',
    userId: 'user-1',
    token: 'verify_abc123',
    type: 'EMAIL_VERIFICATION',
    user: { id: 'user-1', email: 'test@example.com' },
  };

  beforeEach(() => {
    mockPrismaRead = {
      verificationToken: {
        findFirst: jest.fn().mockResolvedValue(mockToken),
      },
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', email: 'test@example.com', emailVerified: false }),
      },
    };
    mockPrismaWrite = {
      $transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {
          user: { update: jest.fn().mockResolvedValue({}) },
          verificationToken: {
            delete: jest.fn().mockResolvedValue({}),
            create: jest.fn().mockResolvedValue({}),
          },
          outbox: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      }),
      verificationToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    mockQueue = {
      publish: jest.fn().mockResolvedValue(undefined),
      sendToQueue: jest.fn().mockResolvedValue(undefined),
    };
    mockConfig = {
      get: jest.fn().mockReturnValue(86400),
      getOptional: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return defaultValue;
      }),
    };

    service = new EmailVerificationService(mockPrismaWrite, mockPrismaRead, mockQueue, mockConfig);
  });

  describe('verifyEmail', () => {
    it('should verify email successfully with valid token', async () => {
      const result = await service.verifyEmail('verify_abc123');
      expect(result.emailVerified).toBe(true);
      expect(result.verifiedAt).toBeDefined();
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });

    it('should throw for invalid or expired token', async () => {
      mockPrismaRead.verificationToken.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid_token')).rejects.toThrow();
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email for unverified user', async () => {
      const result = await service.resendVerification('test@example.com');
      expect(result).toBe(true);
      expect(mockPrismaWrite.verificationToken.deleteMany).toHaveBeenCalled();
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });

    it('should return true for non-existent user (prevent enumeration)', async () => {
      mockPrismaRead.user.findFirst.mockResolvedValue(null);

      const result = await service.resendVerification('nonexistent@example.com');
      expect(result).toBe(true);
    });

    it('should return true if already verified', async () => {
      mockPrismaRead.user.findFirst.mockResolvedValue({ id: 'user-1', emailVerified: true });

      const result = await service.resendVerification('test@example.com');
      expect(result).toBe(true);
    });

    it('should lowercase email before lookup', async () => {
      await service.resendVerification('TEST@EXAMPLE.COM');
      expect(mockPrismaRead.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', deletedAt: null },
      });
    });
  });
});
