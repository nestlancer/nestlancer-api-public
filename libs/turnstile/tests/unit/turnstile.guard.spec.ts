import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TurnstileGuard } from '../../src/turnstile.guard';
import { TurnstileService } from '../../src/turnstile.service';

describe('TurnstileGuard', () => {
  let guard: TurnstileGuard;
  let reflector: jest.Mocked<Reflector>;
  let turnstileService: jest.Mocked<TurnstileService>;

  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    reflector = { get: jest.fn() } as unknown as jest.Mocked<Reflector>;
    turnstileService = { verify: jest.fn(), isEnabled: jest.fn().mockReturnValue(true) } as unknown as jest.Mocked<TurnstileService>;
    guard = new TurnstileGuard(reflector, turnstileService);
    process.env.NODE_ENV = 'production'; // Ensure we don't hit the bypass
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  const createMockContext = (token: string | undefined): ExecutionContext => {
    const req = {
      body: { 'cf-turnstile-response': token },
      headers: {},
      ip: '127.0.0.1',
    };
    return {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if turnstile is not required', async () => {
    reflector.get.mockReturnValue(false);
    const context = createMockContext(undefined);

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow access when Turnstile is disabled (no secret)', async () => {
    reflector.get.mockReturnValue(true);
    turnstileService.isEnabled.mockReturnValue(false);
    const context = createMockContext(undefined);

    expect(await guard.canActivate(context)).toBe(true);
    expect(turnstileService.verify).not.toHaveBeenCalled();
  });

  it('should allow access in test environment even if required', async () => {
    process.env.NODE_ENV = 'test';
    reflector.get.mockReturnValue(true);
    const context = createMockContext(undefined);

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException if token is missing', async () => {
    reflector.get.mockReturnValue(true);
    const context = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if verification fails', async () => {
    reflector.get.mockReturnValue(true);
    const context = createMockContext('invalid-token');
    turnstileService.verify.mockResolvedValue({ success: false });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow access if verification succeeds', async () => {
    reflector.get.mockReturnValue(true);
    const context = createMockContext('valid-token');
    turnstileService.verify.mockResolvedValue({ success: true });

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should also read token from headers', async () => {
    reflector.get.mockReturnValue(true);
    const req = {
      body: {},
      headers: { 'x-turnstile-token': 'header-token' },
      ip: '127.0.0.1',
    };
    const context = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    turnstileService.verify.mockResolvedValue({ success: true });

    expect(await guard.canActivate(context)).toBe(true);
    expect(turnstileService.verify).toHaveBeenCalledWith('header-token', '127.0.0.1');
  });
});
