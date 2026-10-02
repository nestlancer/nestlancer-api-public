jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_temp_password'),
}));

import { BusinessLogicException, UserRole, UserStatus } from '@nestlancer/common';
import { UsersAdminService } from '../../../src/services/users.admin.service';

describe('UsersAdminService', () => {
  let service: UsersAdminService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockConfig: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    status: 'ACTIVE',
    emailVerified: true,
    avatar: null,
    phone: null,
    marketingConsent: false,
    lastLoginAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    authConfig: { twoFactorEnabled: false, mustChangePassword: false },
    preferences: null,
  };

  const soleAdmin = {
    ...mockUser,
    id: 'admin-1',
    email: 'admin@example.com',
    role: 'ADMIN',
    authConfig: { twoFactorEnabled: true, mustChangePassword: false },
  };

  beforeEach(() => {
    mockPrismaRead = {
      $queryRaw: jest.fn().mockResolvedValue([{ mustChangePassword: false }]),
      user: {
        findMany: jest.fn().mockResolvedValue([mockUser, soleAdmin]),
        count: jest.fn().mockResolvedValue(2),
        findUnique: jest.fn().mockResolvedValue(mockUser),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      session: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sess-1',
            token: 'secret-token',
            ip: '127.0.0.1',
            userAgent: 'jest',
            deviceInfo: null,
            expiresAt: new Date(Date.now() + 3600000),
            lastActiveAt: new Date(),
            createdAt: new Date(),
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
      authConfig: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    mockPrismaWrite = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      user: {
        update: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'admin-1') return Promise.resolve(soleAdmin);
          return Promise.resolve(mockUser);
        }),
      },
      session: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      authConfig: {
        upsert: jest.fn().mockResolvedValue({}),
      },
      outbox: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {
          $executeRaw: jest.fn().mockResolvedValue(1),
          user: { update: jest.fn().mockResolvedValue({}) },
          session: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
          authConfig: { upsert: jest.fn().mockResolvedValue({}) },
          outbox: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      }),
    };
    mockConfig = {
      get: jest.fn().mockReturnValue(12),
    };
    const mockQueuePublisher = {
      sendToQueue: jest.fn().mockResolvedValue(undefined),
    };

    service = new UsersAdminService(
      mockPrismaWrite,
      mockPrismaRead,
      mockConfig,
      mockQueuePublisher,
    );
  });

  describe('listUsers', () => {
    it('should return paginated users list without secrets', async () => {
      const result = await service.listUsers(1, 10);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).not.toHaveProperty('passwordHash');
      expect(result.pagination.page).toBe(1);
    });

    it('should filter by status and role', async () => {
      await service.listUsers(1, 10, 'ACTIVE', 'USER');
      expect(mockPrismaRead.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'ACTIVE', role: 'USER' },
        }),
      );
    });

    it('should map legacy CLIENT role filter to USER', async () => {
      await service.listUsers(1, 5, undefined, 'CLIENT');
      expect(mockPrismaRead.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: 'USER' },
        }),
      );
    });

    it('should reject unknown role filters without hitting Prisma', async () => {
      await expect(service.listUsers(1, 5, undefined, 'OPERATOR')).rejects.toThrow(
        BusinessLogicException,
      );
      expect(mockPrismaRead.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getUserDetails', () => {
    it('should return sanitized user details', async () => {
      const result = await service.getUserDetails('user-1');
      expect(result.id).toBe('user-1');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('twoFactorSecret');
    });

    it('should throw for non-existent user', async () => {
      mockPrismaRead.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserDetails('invalid-id')).rejects.toThrow(BusinessLogicException);
    });
  });

  describe('getUserSessions', () => {
    it('should not expose session tokens', async () => {
      const result = await service.getUserSessions('user-1');
      expect(result.data[0]).not.toHaveProperty('token');
      expect(result.data[0].id).toBe('sess-1');
    });
  });

  describe('sole admin protection', () => {
    beforeEach(() => {
      mockPrismaRead.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === 'admin-1') return Promise.resolve(soleAdmin);
        return Promise.resolve(mockUser);
      });
      mockPrismaRead.user.count.mockResolvedValue(1);
    });

    it('should block demoting sole admin', async () => {
      await expect(service.changeRole('admin-1', UserRole.USER)).rejects.toThrow(
        BusinessLogicException,
      );
    });

    it('should block suspending sole admin', async () => {
      await expect(service.changeUserStatus('admin-1', UserStatus.SUSPENDED)).rejects.toThrow(
        BusinessLogicException,
      );
    });

    it('should block deleting sole admin', async () => {
      await expect(service.deleteUser('admin-1')).rejects.toThrow(BusinessLogicException);
    });

    it('should block promoting when another admin exists', async () => {
      mockPrismaRead.user.count.mockResolvedValue(1);
      await expect(service.changeRole('user-1', UserRole.ADMIN)).rejects.toThrow(
        BusinessLogicException,
      );
    });
  });

  describe('changeUserStatus', () => {
    it('should update user status and revoke sessions when suspending', async () => {
      await service.changeUserStatus('user-1', UserStatus.SUSPENDED);
      expect(mockPrismaWrite.user.update).toHaveBeenCalled();
      expect(mockPrismaWrite.session.updateMany).toHaveBeenCalled();
    });
  });

  describe('forcePasswordReset', () => {
    it('should set mustChangePassword and revoke sessions', async () => {
      const result = await service.forcePasswordReset('user-1');
      expect(result.passwordResetRequired).toBe(true);
      expect(mockPrismaWrite.authConfig.upsert).toHaveBeenCalled();
      expect(mockPrismaWrite.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('bulkOperation', () => {
    it('should fail resetPassword bulk action with clear error', async () => {
      const result = await service.bulkOperation({
        userIds: ['user-1'],
        action: 'resetPassword' as any,
        reason: 'test',
      });
      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toContain('Bulk password reset');
    });
  });

  describe('adminResetPassword', () => {
    it('should reset password without returning plaintext', async () => {
      const result = await service.adminResetPassword('user-1', 'NewPassword123!');
      expect(result.passwordReset).toBe(true);
      expect(result).not.toHaveProperty('temporaryPasswordReturnOnlyIfRequested');
      expect(result.message).toBeDefined();
    });

    it('should run transaction for password reset', async () => {
      await service.adminResetPassword('user-1', 'NewPassword123!');
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });
  });
});
