import { ExecutionContext, HttpException } from '@nestjs/common';
import { ThrottleGuard } from '../../../src/guards/throttle.guard';

describe('ThrottleGuard', () => {
  let guard: ThrottleGuard;
  const prev = {
    RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED,
    RATE_LIMIT_LIMIT: process.env.RATE_LIMIT_LIMIT,
    RATE_LIMIT_ANONYMOUS: process.env.RATE_LIMIT_ANONYMOUS,
    RATE_LIMIT_USER: process.env.RATE_LIMIT_USER,
    RATE_LIMIT_TTL: process.env.RATE_LIMIT_TTL,
  };

  beforeEach(() => {
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_LIMIT = '100';
    process.env.RATE_LIMIT_ANONYMOUS = '100';
    process.env.RATE_LIMIT_USER = '1000';
    process.env.RATE_LIMIT_TTL = '60';
    guard = new ThrottleGuard();
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  function mockContext(req: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({ setHeader: () => undefined }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow first request', () => {
    const mockRequest = { ip: '127.0.0.1', headers: {} };
    expect(guard.canActivate(mockContext(mockRequest))).toBe(true);
  });

  it('should allow consecutive requests below limit', () => {
    const mockRequest = { ip: '127.0.0.1', headers: {} };
    const ctx = mockContext(mockRequest);

    for (let i = 0; i < 99; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });

  it('should throw exception when limit exceeded', () => {
    const mockRequest = { ip: '127.0.0.1', headers: {} };
    const ctx = mockContext(mockRequest);

    for (let i = 0; i < 100; i++) {
      guard.canActivate(ctx);
    }

    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
  });

  it('should no-op when RATE_LIMIT_ENABLED is Infisical-quoted false', () => {
    process.env.RATE_LIMIT_ENABLED = "'false'";
    guard = new ThrottleGuard();
    const mockRequest = { ip: '10.0.0.9', path: '/auth/login', headers: {} };
    const ctx = mockContext(mockRequest);
    for (let i = 0; i < 50; i++) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });
});
