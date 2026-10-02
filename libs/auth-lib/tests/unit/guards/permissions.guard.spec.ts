import { PermissionsGuard } from '../../../src/guards/permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;
  let context: ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new PermissionsGuard(reflector);
    context = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn(),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  });

  it('should return true if no permissions are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true if user is ADMIN', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['contact:manage']);
    (context.switchToHttp().getRequest as jest.Mock).mockReturnValue({
      user: { role: 'ADMIN' },
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true when USER has the required permission', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['users:read:own']);
    (context.switchToHttp().getRequest as jest.Mock).mockReturnValue({
      user: { role: 'USER' },
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required permission', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['contact:manage']);
    (context.switchToHttp().getRequest as jest.Mock).mockReturnValue({
      user: { role: 'USER' },
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user is missing', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['read:users']);
    (context.switchToHttp().getRequest as jest.Mock).mockReturnValue({});
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
