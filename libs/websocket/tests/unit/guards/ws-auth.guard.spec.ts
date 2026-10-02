import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

import { WsAuthGuard } from '../../../src/guards/ws-auth.guard';
import { installTestAccessKeys } from '../test-access-keys';

describe('WsAuthGuard', () => {
  let guard: WsAuthGuard;
  let signAccess: (payload: Record<string, unknown>) => string;

  beforeEach(() => {
    guard = new WsAuthGuard();
    ({ signAccess } = installTestAccessKeys());
  });

  it('should allow access if token is in handshake auth', () => {
    const token = signAccess({ sub: 'user-1', role: 'USER' });
    const mockContext = {
      switchToWs: () => ({
        getClient: () => ({
          handshake: { auth: { token } },
          data: {},
        }),
      }),
    } as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow access if token is in handshake headers', () => {
    const token = signAccess({ sub: 'user-1', role: 'USER' });
    const mockContext = {
      switchToWs: () => ({
        getClient: () => ({
          handshake: { headers: { authorization: `Bearer ${token}` } },
          data: {},
        }),
      }),
    } as ExecutionContext;
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw WsException if token is missing', () => {
    const mockContext = {
      switchToWs: () => ({
        getClient: () => ({ handshake: {}, data: {} }),
      }),
    } as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(WsException);
  });
});
