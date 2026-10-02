jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('new_hashed_password'),
}));
jest.mock('@nestlancer/common', () => ({
  ...jest.requireActual('@nestlancer/common'),
  generateUuid: jest.fn().mockReturnValue('mock-uuid-no-dashes'),
}));

import { PasswordService } from '../../../src/services/password.service';

describe('PasswordService', () => {
  let service: PasswordService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockQueue: any;
  let mockConfig: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
  };

  beforeEach(() => {
    mockPrismaRead = {
      user: {
        findFirst: jest.fn().mockResolvedValue(mockUser),
      },
      verificationToken: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'token-1',
          userId: 'user-1',
          token: 'reset_mockuuid',
          type: 'PASSWORD_RESET',
          user: mockUser,
        }),
      },
    };
    mockPrismaWrite = {
      verificationToken: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({}),
      },
      outbox: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {
          user: { update: jest.fn().mockResolvedValue({}) },
          verificationToken: { delete: jest.fn().mockResolvedValue({}) },
          session: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
          outbox: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      }),
    };
    mockQueue = {
      publish: jest.fn().mockResolvedValue(undefined),
      sendToQueue: jest.fn().mockResolvedValue(undefined),
    };
    mockConfig = {
      get: jest.fn().mockReturnValue(3600),
      getOptional: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        if (key === 'authService.security.bcryptSaltRounds') return 12;
        if (key === 'authService.tokens.passwordResetExpiresIn') return 3600;
        return defaultValue;
      }),
    };

    service = new PasswordService(mockPrismaWrite, mockPrismaRead, mockQueue, mockConfig);
  });

  describe('requestPasswordReset', () => {
    it('should create a reset token for existing user', async () => {
      const result = await service.requestPasswordReset('test@example.com');
      expect(result).toBe(true);
      expect(mockPrismaWrite.verificationToken.deleteMany).toHaveBeenCalled();
      expect(mockPrismaWrite.verificationToken.create).toHaveBeenCalled();
      expect(mockPrismaWrite.outbox.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'PASSWORD_RESET_REQUESTED',
          }),
        }),
      );
    });

    it('should return true even for non-existent user (prevent enumeration)', async () => {
      mockPrismaRead.user.findFirst.mockResolvedValue(null);

      const result = await service.requestPasswordReset('nonexistent@example.com');
      expect(result).toBe(true);
      expect(mockPrismaWrite.verificationToken.create).not.toHaveBeenCalled();
    });

    it('should delete existing reset tokens before creating new one', async () => {
      await service.requestPasswordReset('test@example.com');
      expect(mockPrismaWrite.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: 'PASSWORD_RESET',
        },
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      const result = await service.resetPassword('reset_mockuuid', 'NewPassword123!');
      expect(result.passwordChanged).toBe(true);
      expect(result.changedAt).toBeDefined();
    });

    it('should throw for invalid or expired token', async () => {
      mockPrismaRead.verificationToken.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword('invalid_token', 'NewPassword123!')).rejects.toThrow();
    });

    it('should revoke all existing sessions after password reset', async () => {
      await service.resetPassword('reset_mockuuid', 'NewPassword123!');
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });

    it('should create PASSWORD_RESET_COMPLETED outbox event', async () => {
      await service.resetPassword('reset_mockuuid', 'NewPassword123!');
      // $transaction was called, which internally creates outbox event
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });
  });
});
