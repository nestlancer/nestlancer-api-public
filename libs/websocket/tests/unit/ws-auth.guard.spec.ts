import { WsException } from '@nestjs/websockets';

import { WsAuthGuard } from '../../src/guards/ws-auth.guard';
import { installTestAccessKeys } from './test-access-keys';

describe('WsAuthGuard', () => {
  let guard: WsAuthGuard;
  let signAccess: (payload: Record<string, unknown>) => string;

  beforeEach(() => {
    guard = new WsAuthGuard();
    ({ signAccess } = installTestAccessKeys());
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should attach user when token is valid', () => {
    const token = signAccess({ sub: 'user-1', role: 'USER' });
    const client = {
      handshake: { auth: { token } },
      data: {} as { user?: { userId: string } },
    };
    const context = {
      switchToWs: () => ({
        getClient: () => client,
      }),
    } as any;

    expect(guard.canActivate(context)).toBe(true);
    expect(client.data.user?.userId).toBe('user-1');
  });

  it('should throw WsException if token is missing', () => {
    const context = {
      switchToWs: () => ({
        getClient: () => ({
          handshake: {},
          data: {},
        }),
      }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow(WsException);
  });
});
