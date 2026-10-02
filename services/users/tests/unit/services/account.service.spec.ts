jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { AccountService } from '../../../src/services/account.service';

describe('AccountService', () => {
  let service: AccountService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockConfig: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    status: 'ACTIVE',
  };

  beforeEach(() => {
    mockPrismaRead = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
      },
    };
    mockPrismaWrite = {
      $transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {
          user: { update: jest.fn().mockResolvedValue({}) },
          session: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          outbox: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      }),
    };
    mockConfig = {
      get: jest.fn().mockReturnValue(30),
    };

    service = new AccountService(mockPrismaWrite, mockPrismaRead, mockConfig);
  });

  describe('requestAccountDeletion', () => {
    it('should schedule account deletion with valid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.requestAccountDeletion('user-1', {
        password: 'Password123!',
        reason: 'No longer needed',
        feedback: 'Great service',
      });

      expect(result.gracePeriodDays).toBe(30);
      expect(result.deletionDate).toBeDefined();
      expect(result.canCancelUntil).toBeDefined();
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });

    it('should throw for incorrect password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.requestAccountDeletion('user-1', {
          password: 'WrongPassword',
          reason: 'test',
        }),
      ).rejects.toThrow();
    });

    it('should proceed without password check when no password provided', async () => {
      const result = await service.requestAccountDeletion('user-1', {
        reason: 'test',
      });
      expect(result.gracePeriodDays).toBe(30);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('cancelDeletionRequest', () => {
    it('should cancel pending deletion', async () => {
      mockPrismaRead.user.findUnique.mockResolvedValue({ ...mockUser, status: 'PENDING_DELETION' });

      const result = await service.cancelDeletionRequest('user-1');
      expect(result).toBe(true);
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });

    it('should return true if user is already active', async () => {
      const result = await service.cancelDeletionRequest('user-1');
      expect(result).toBe(true);
    });
  });
});
