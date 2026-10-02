import { RolesGuard } from '../../../src/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let context: ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
    context = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn(),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  });

  it('should return true if no roles are required', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true if user has required role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);
    (context.switchToHttp().getRequest as jest.Mock).mockReturnValue({
      user: { role: 'ADMIN' },
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user does not have required role', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);
    (context.switchToHttp().getRequest as jest.Mock).mockReturnValue({
      user: { role: 'USER' },
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user is not present', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMIN']);
    (context.switchToHttp().getRequest as jest.Mock).mockReturnValue({});
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
