import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IdempotencyGuard } from '../../src/idempotency.guard';
import { IDEMPOTENT_KEY } from '../../src/decorators/idempotent.decorator';

describe('IdempotencyGuard', () => {
  let guard: IdempotencyGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { get: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new IdempotencyGuard(reflector);
  });

  it('should allow if route is not marked as idempotent', () => {
    reflector.get.mockReturnValue(false);
    const mockContext = { getHandler: jest.fn() } as unknown as ExecutionContext;
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow if route is idempotent and has no key (interceptor handles logic)', () => {
    reflector.get.mockImplementation((key) => (key === IDEMPOTENT_KEY ? true : false));
    const mockRequest = { headers: {} };
    const mockContext = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow if route is idempotent and has key', () => {
    reflector.get.mockImplementation((key) => (key === IDEMPOTENT_KEY ? true : false));
    const mockRequest = { headers: { 'x-idempotency-key': '12345' } };
    const mockContext = {
      getHandler: jest.fn(),
      switchToHttp: () => ({ getRequest: () => mockRequest }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });
});
