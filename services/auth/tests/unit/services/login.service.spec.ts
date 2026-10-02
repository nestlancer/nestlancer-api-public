jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { LoginService } from '../../../src/services/login.service';

describe('LoginService', () => {
  let service: LoginService;
  let mockPrismaRead: any;
  let mockPrismaWrite: any;
  let mockLockoutService: any;
  let mockTokenService: any;
  let mockQueuePublisher: { sendToQueue: jest.Mock };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    status: 'ACTIVE',
    emailVerified: true,
    authConfig: { twoFactorEnabled: false },
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
  };

  const ctx = {
    ipAddress: '127.0.0.1',
    userAgent: 'TestAgent/1.0',
    origin: 'https://app.nestlancer.com',
  };

  beforeEach(() => {
    mockPrismaRead = {
      user: {
        findFirst: jest.fn().mockResolvedValue(mockUser),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ mustChangePassword: false }]),
    };
    mockPrismaWrite = {
      authSession: {
        create: jest.fn().mockResolvedValue({}),
      },
    };
    mockLockoutService = {
      checkLockout: jest.fn().mockResolvedValue(undefined),
      handleFailedAttempt: jest.fn().mockResolvedValue(4),
      resetFailedAttempts: jest.fn().mockResolvedValue(undefined),
      recordIpFailure: jest.fn().mockResolvedValue(undefined),
      clearIpFailures: jest.fn(),
    };
    mockTokenService = {
      generateAuthTokens: jest.fn().mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 900,
        tokenType: 'Bearer',
        user: { id: 'user-1' },
      }),
    };
    mockQueuePublisher = { sendToQueue: jest.fn().mockResolvedValue(undefined) };
    const mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'authService.security.bcryptSaltRounds') return 10;
        return undefined;
      }),
    };

    service = new LoginService(
      mockPrismaRead,
      mockPrismaWrite,
      mockLockoutService,
      mockTokenService,
      mockQueuePublisher as any,
      mockConfig as any,
    );
  });

  describe('authenticate', () => {
    const loginDto = { email: 'test@example.com', password: 'Password123!', rememberMe: false };

    it('should authenticate successfully with valid credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.authenticate(loginDto, ctx);
      expect(result.accessToken).toBe('access-token');
      expect(mockLockoutService.checkLockout).toHaveBeenCalledWith('user-1', mockUser.authConfig);
      expect(mockLockoutService.resetFailedAttempts).toHaveBeenCalledWith('user-1');
      expect(mockTokenService.generateAuthTokens).toHaveBeenCalledWith(
        mockUser,
        false,
        ctx.ipAddress,
        ctx.userAgent,
        'client',
      );
      expect(mockQueuePublisher.sendToQueue).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ action: 'LOGIN', userId: 'user-1' }),
      );
    });

    it('should reject admin credentials on client portal origin', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaRead.user.findFirst.mockResolvedValue({ ...mockUser, role: 'ADMIN' });

      await expect(service.authenticate(loginDto, ctx)).rejects.toThrow();
      expect(mockTokenService.generateAuthTokens).not.toHaveBeenCalled();
      expect(mockQueuePublisher.sendToQueue).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          description: 'Failed sign-in attempt (wrong portal)',
          userId: 'user-1',
        }),
      );
    });

    it('should throw BusinessLogicException for non-existent user', async () => {
      mockPrismaRead.user.findFirst.mockResolvedValue(null);

      await expect(service.authenticate(loginDto, ctx)).rejects.toThrow();
      expect(mockLockoutService.recordIpFailure).toHaveBeenCalledWith(ctx.ipAddress);
      expect(mockQueuePublisher.sendToQueue).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          description: 'Failed sign-in attempt (unknown account)',
        }),
      );
    });

    it('should throw ForbiddenException for suspended accounts', async () => {
      mockPrismaRead.user.findFirst.mockResolvedValue({ ...mockUser, status: 'SUSPENDED' });

      await expect(service.authenticate(loginDto, ctx)).rejects.toThrow();
    });

    it('should throw BusinessLogicException for invalid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.authenticate(loginDto, ctx)).rejects.toThrow();
      expect(mockLockoutService.handleFailedAttempt).toHaveBeenCalledWith(
        'user-1',
        mockUser.authConfig,
      );
      expect(mockLockoutService.recordIpFailure).toHaveBeenCalledWith(ctx.ipAddress);
      expect(mockQueuePublisher.sendToQueue).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          description: 'Failed sign-in attempt (invalid password)',
          userId: 'user-1',
          userAgent: ctx.userAgent,
        }),
      );
    });

    it('should audit portal mismatch when a client signs into the admin portal', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const adminCtx = {
        ...ctx,
        origin: 'https://admin.nestlancer.com',
      };

      await expect(service.authenticate(loginDto, adminCtx)).rejects.toThrow();
      expect(mockQueuePublisher.sendToQueue).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          description: 'Failed sign-in attempt (wrong portal)',
          userId: 'user-1',
        }),
      );
    });

    it('should throw ForbiddenException for unverified email', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaRead.user.findFirst.mockResolvedValue({ ...mockUser, emailVerified: false });

      await expect(service.authenticate(loginDto, ctx)).rejects.toThrow();
    });

    it('should block login when mustChangePassword is set', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaRead.user.findFirst.mockResolvedValue({
        ...mockUser,
        authConfig: { twoFactorEnabled: false, mustChangePassword: true },
      });

      await expect(service.authenticate(loginDto, ctx)).rejects.toThrow();
      expect(mockTokenService.generateAuthTokens).not.toHaveBeenCalled();
    });

    it('should return 2FA challenge when 2FA is enabled', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaRead.user.findFirst.mockResolvedValue({
        ...mockUser,
        authConfig: { twoFactorEnabled: true },
      });

      const result = await service.authenticate(loginDto, ctx);
      expect(result.requires2FA).toBe(true);
      expect(result.authSessionId).toBeDefined();
      expect(result.methodsAvailable).toContain('totp');
      expect(mockPrismaWrite.authSession.create).toHaveBeenCalled();
    });

    it('should lowercase email before lookup', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const upperDto = { ...loginDto, email: 'TEST@EXAMPLE.COM' };

      await service.authenticate(upperDto, ctx);
      expect(mockPrismaRead.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', deletedAt: null },
        include: { authConfig: true },
      });
    });
  });
});
