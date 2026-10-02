jest.mock('@nestlancer/common', () => ({
  ...jest.requireActual('@nestlancer/common'),
  generateUuid: jest.fn().mockReturnValue('mock-uuid-1234'),
}));

const mockSign = jest.fn();
const mockVerify = jest.fn();

jest.mock('jsonwebtoken', () => ({
  sign: (...args: unknown[]) => mockSign(...args),
  verify: (...args: unknown[]) => mockVerify(...args),
  decode: jest.fn(),
}));

import { TokenService } from '../../../src/services/token.service';

describe('TokenService', () => {
  let service: TokenService;
  let mockConfigService: any;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockAccessTokenRevocation: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'USER',
    avatar: 'avatar.jpg',
    emailVerified: true,
    status: 'ACTIVE',
    authConfig: { twoFactorEnabled: false },
  };

  beforeEach(() => {
    mockSign.mockImplementation((payload: { type?: string }, _secret, _options, callback) => {
      const token = payload.type === 'access' ? 'mock-access-token' : 'mock-refresh-token';
      callback(null, token);
    });
    mockVerify.mockImplementation((_token, _key, _options, callback) => {
      callback(null, {
        sub: 'user-1',
        type: 'refresh',
        jti: 'mock-uuid-1234',
        exp: Math.floor(Date.now() / 1000) + 604800,
      });
    });

    const jwtConfig: Record<string, unknown> = {
      'authService.jwt.accessExpiresIn': 900,
      'authService.jwt.refreshExpiresIn': 604800,
      'authService.jwt.accessPrivateKey': 'access-private-key',
      'authService.jwt.refreshPrivateKey': 'refresh-private-key',
      'authService.jwt.refreshPublicKey': 'refresh-public-key',
      'authService.jwt.issuer': 'nestlancer',
      'authService.jwt.audience': 'nestlancer-api',
    };
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => jwtConfig[key]),
      getOptional: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: unknown) =>
          key in jwtConfig ? jwtConfig[key] : defaultValue,
        ),
    };
    mockPrismaWrite = {
      session: {
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          userId: 'user-1',
          token: 'mock-uuid-1234',
          expiresAt: new Date(Date.now() + 3_600_000),
        }),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    mockPrismaRead = {
      session: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          userId: 'user-1',
          token: 'mock-uuid-1234',
          expiresAt: new Date(Date.now() + 3_600_000),
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ mustChangePassword: false }]),
    };

    const mockQueuePublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
      sendToQueue: jest.fn().mockResolvedValue(undefined),
    };

    mockAccessTokenRevocation = {
      revokeAccessJti: jest.fn().mockResolvedValue(undefined),
      revokeRefreshJti: jest.fn().mockResolvedValue(undefined),
      markUserLoggedOutEverywhere: jest.fn().mockResolvedValue(undefined),
      isAccessTokenRevoked: jest.fn().mockResolvedValue(false),
      getRefreshRotationGrace: jest.fn().mockResolvedValue(null),
      setRefreshRotationGrace: jest.fn().mockResolvedValue(undefined),
      tryAcquireRefreshRotationLock: jest.fn().mockResolvedValue(true),
      releaseRefreshRotationLock: jest.fn().mockResolvedValue(undefined),
      isRefreshTokenRevoked: jest.fn().mockResolvedValue(false),
    };

    service = new TokenService(
      mockConfigService,
      mockPrismaWrite,
      mockPrismaRead,
      mockQueuePublisher as any,
      mockAccessTokenRevocation as any,
    );
  });

  describe('generateAuthTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const result = await service.generateAuthTokens(mockUser, false, '127.0.0.1', 'TestAgent');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.expiresIn).toBe(900);
      expect(result.tokenType).toBe('Bearer');
    });

    it('should include user info in response', async () => {
      const result = await service.generateAuthTokens(mockUser);
      expect(result.user.id).toBe('user-1');
      expect(result.user.email).toBe('test@example.com');
      expect(result.user.firstName).toBe('John');
      expect(result.user.role).toBe('USER');
    });

    it('should create a session record', async () => {
      await service.generateAuthTokens(mockUser, false, '127.0.0.1', 'TestAgent');
      expect(mockPrismaWrite.session.deleteMany).toHaveBeenCalled();
      expect(mockPrismaRead.session.findMany).toHaveBeenCalled();
      expect(mockPrismaWrite.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            token: 'mock-uuid-1234',
            ip: '127.0.0.1',
            userAgent: 'TestAgent',
          }),
        }),
      );
    });

    it('should use RS256 algorithm', async () => {
      await service.generateAuthTokens(mockUser);
      expect(mockSign).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({ algorithm: 'RS256' }),
        expect.any(Function),
      );
    });

    it('should use null for missing ipAddress and userAgent', async () => {
      await service.generateAuthTokens(mockUser);
      expect(mockPrismaWrite.session.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ip: null,
            userAgent: null,
          }),
        }),
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const result = await service.refreshToken('old-refresh-token', '127.0.0.1', 'TestAgent');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('should revoke old session on refresh', async () => {
      await service.refreshToken('old-refresh-token', '127.0.0.1', 'TestAgent');
      expect(mockPrismaWrite.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      expect(mockAccessTokenRevocation.revokeRefreshJti).toHaveBeenCalled();
    });

    it('returns the in-flight successor only when another refresh still holds the lock', async () => {
      mockAccessTokenRevocation.tryAcquireRefreshRotationLock.mockResolvedValue(false);
      mockAccessTokenRevocation.getRefreshRotationGrace.mockResolvedValue({
        accessToken: 'grace-access',
        refreshToken: 'grace-refresh',
        expiresIn: 900,
        tokenType: 'Bearer',
      });

      const result = await service.refreshToken('old-refresh-token', '127.0.0.1', 'TestAgent');

      expect(result.accessToken).toBe('grace-access');
      expect(result.refreshToken).toBe('grace-refresh');
      expect(mockPrismaWrite.session.delete).not.toHaveBeenCalled();
      expect(mockAccessTokenRevocation.markUserLoggedOutEverywhere).not.toHaveBeenCalled();
    });

    it('returns grace tokens when session already rotated but grace window is open', async () => {
      mockAccessTokenRevocation.getRefreshRotationGrace.mockResolvedValue({
        accessToken: 'grace-access',
        refreshToken: 'grace-refresh',
        expiresIn: 900,
        tokenType: 'Bearer',
      });
      mockPrismaWrite.session.findFirst.mockResolvedValue(null);
      mockAccessTokenRevocation.isRefreshTokenRevoked.mockResolvedValue(true);

      const result = await service.refreshToken('old-refresh-token', '127.0.0.1', 'TestAgent');

      expect(result.accessToken).toBe('grace-access');
      expect(result.refreshToken).toBe('grace-refresh');
      expect(mockAccessTokenRevocation.markUserLoggedOutEverywhere).not.toHaveBeenCalled();
    });

    it('treats a consumed refresh token as reuse after grace has expired', async () => {
      mockAccessTokenRevocation.getRefreshRotationGrace.mockResolvedValue(null);
      mockPrismaWrite.session.findFirst.mockResolvedValue(null);
      mockAccessTokenRevocation.isRefreshTokenRevoked.mockResolvedValue(true);

      await expect(
        service.refreshToken('old-refresh-token', '127.0.0.1', 'TestAgent'),
      ).rejects.toThrow('Refresh token reuse detected');

      expect(mockAccessTokenRevocation.markUserLoggedOutEverywhere).toHaveBeenCalledWith('user-1');
    });

    it('should reject reuse of a rotated refresh token', async () => {
      mockPrismaWrite.session.findFirst.mockResolvedValue(null);
      mockAccessTokenRevocation.isRefreshTokenRevoked.mockResolvedValue(true);
      mockAccessTokenRevocation.getRefreshRotationGrace.mockResolvedValue(null);

      await expect(
        service.refreshToken('reused-refresh-token', '127.0.0.1', 'TestAgent'),
      ).rejects.toThrow('Refresh token reuse detected');

      expect(mockPrismaWrite.session.deleteMany).toHaveBeenCalled();
      expect(mockAccessTokenRevocation.markUserLoggedOutEverywhere).toHaveBeenCalledWith('user-1');
    });

    it('should throw for invalid token type', async () => {
      mockVerify.mockImplementation((_token, _key, _options, callback) => {
        callback(null, { sub: 'user-1', type: 'access', jti: 'test' });
      });

      await expect(
        service.refreshToken('wrong-type-token', '127.0.0.1', 'TestAgent'),
      ).rejects.toThrow();
    });

    it('should throw for revoked session', async () => {
      mockPrismaWrite.session.findFirst.mockResolvedValue(null);

      await expect(
        service.refreshToken('revoked-token', '127.0.0.1', 'TestAgent'),
      ).rejects.toThrow();
    });

    it('should throw for inactive user', async () => {
      mockPrismaRead.user.findUnique.mockResolvedValue({ ...mockUser, status: 'SUSPENDED' });

      await expect(service.refreshToken('token', '127.0.0.1', 'TestAgent')).rejects.toThrow();
    });

    it('should throw when mustChangePassword is set', async () => {
      mockPrismaRead.user.findUnique.mockResolvedValue({
        ...mockUser,
        authConfig: { twoFactorEnabled: false, mustChangePassword: true },
      });

      await expect(service.refreshToken('token', '127.0.0.1', 'TestAgent')).rejects.toThrow(
        'Password change required',
      );
    });

    it('should throw for expired refresh token', async () => {
      mockVerify.mockImplementation((_token, _key, _options, callback) => {
        callback(new Error('jwt expired'), null);
      });

      await expect(
        service.refreshToken('expired-token', '127.0.0.1', 'TestAgent'),
      ).rejects.toThrow();
    });
  });

  describe('revokeRefreshSession', () => {
    it('should revoke refresh session and access token for client-audience tokens', async () => {
      const jwt = require('jsonwebtoken');
      jwt.decode.mockReturnValue({
        sub: 'user-1',
        type: 'access',
        jti: 'access-jti-1',
        exp: Math.floor(Date.now() / 1000) + 900,
      });

      await service.revokeRefreshSession(
        'client-refresh-token',
        undefined,
        'Bearer access-jwt',
      );

      expect(mockPrismaWrite.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
      expect(mockAccessTokenRevocation.revokeRefreshJti).toHaveBeenCalled();
      expect(mockAccessTokenRevocation.revokeAccessJti).toHaveBeenCalledWith(
        'access-jti-1',
        expect.any(Number),
      );
    });
  });
});
