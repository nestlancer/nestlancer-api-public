import { ExecutionContext } from '@nestjs/common';
import { WsThrottleGuard } from '../../../src/guards/ws-throttle.guard';

describe('WsThrottleGuard', () => {
  let guard: WsThrottleGuard;

  beforeEach(() => {
    guard = new WsThrottleGuard();
  });

  it('should allow first websocket request', () => {
    const mockClient = { id: 'client1' };
    const mockContext = {
      switchToWs: () => ({ getClient: () => mockClient }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should return false when limit exceeded', () => {
    const mockClient = { id: 'client1' };
    const mockContext = {
      switchToWs: () => ({ getClient: () => mockClient }),
    } as unknown as ExecutionContext;

    for (let i = 0; i < 60; i++) {
      guard.canActivate(mockContext);
    }

    expect(guard.canActivate(mockContext)).toBe(false);
  });
});
