import { Test, TestingModule } from '@nestjs/testing';
import { AuthLibModule } from '../../src/auth-lib.module';
import { JwtAuthGuard } from '../../src/guards/jwt-auth.guard';
import { JwtStrategy } from '../../src/strategies/jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../src/constants';

describe('AuthLibModule (Integration)', () => {
  let module: TestingModule;
  let guard: JwtAuthGuard;
  let strategy: JwtStrategy;
  let reflector: Reflector;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://localhost:5432/db';
    process.env.REDIS_CACHE_URL = 'redis://localhost:6379';
    process.env.RABBITMQ_URL = 'amqp://localhost';
    process.env.JWT_ACCESS_SECRET = 'secret1234567890';
    process.env.JWT_REFRESH_SECRET = 'secret1234567890';
    process.env.JWT_ACCESS_PUBLIC_KEY =
      '-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsrYYAIHjHvtREpYIs5QA\\nHrInZn5ECnTaLh4d5K0VXIqMWJ3rhJ+6zQGKkwgJOSqkDwVRwmbywjCh+eH03pCT\\n7dbFKHosk2pEirCBNMnH2fADG0XNKhqnW3fqDJxKF/rVy90odq3/rIMFkL4zSqZB\\n5oo+Y2yKgS6KRZbogLHYBr5g9ICwZHQeC7WN/GBlJfsQymzeMVSJih3CvrI7zi5c\\n7jBBwv8ixQciHPCEVz3yEVvHHxNiNbPERgqfL1Qq+s+m25On2L4ZXxkuzpXFgQM6\\nL0O38cA+N85KZnpoY1Pznu7E1rUu5Na44mZmz+aqMIK/IxA6y1FHapJiOL16iccu\\nGQIDAQAB\\n-----END PUBLIC KEY-----\\n';

    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }), AuthLibModule],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    strategy = module.get<JwtStrategy>(JwtStrategy);
    reflector = module.get<Reflector>(Reflector);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
    expect(strategy).toBeDefined();
  });

  describe('JwtAuthGuard', () => {
    it('should allow access for public routes', () => {
      const mockContext = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({ getRequest: () => ({}) }),
      } as unknown as ExecutionContext;

      // Mock reflector to return true for IS_PUBLIC_KEY
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValueOnce(true);

      const result = guard.canActivate(mockContext);
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when handleRequest receives no user', () => {
      expect(() => guard.handleRequest(null, null as any)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when handleRequest receives an error', () => {
      expect(() => guard.handleRequest(new Error('token expired'), null as any)).toThrow(
        UnauthorizedException,
      );
    });

    it('should return user when handleRequest receives a valid user', () => {
      const user = { userId: 'user-1', email: 'test@example.com', role: 'USER' };
      const result = guard.handleRequest(null, user as any);
      expect(result).toEqual(user);
    });
  });

  describe('JwtStrategy', () => {
    it('should validate and transform JWT payload to AuthenticatedUser', () => {
      const payload = {
        sub: 'user-123',
        email: 'test@nestlancer.com',
        role: 'ADMIN',
        jti: 'token-jti-123',
        iat: 1700000000,
        exp: 1700003600,
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user-123',
        sub: 'user-123',
        email: 'test@nestlancer.com',
        role: 'ADMIN',
        jti: 'token-jti-123',
        iat: 1700000000,
        exp: 1700003600,
      });
    });

    it('should handle payload with missing optional fields', () => {
      const payload = {
        sub: 'user-456',
        email: 'minimal@test.com',
        role: 'CLIENT',
      };

      const result = strategy.validate(payload as any);

      expect(result.userId).toBe('user-456');
      expect(result.email).toBe('minimal@test.com');
      expect(result.role).toBe('CLIENT');
      expect(result.iat).toBe(0);
      expect(result.exp).toBe(0);
    });
  });
});
