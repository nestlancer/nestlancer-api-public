import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketLibModule } from '../../src/websocket-lib.module';
import { WsAuthGuard } from '../../src/guards/ws-auth.guard';
import { WsThrottleGuard } from '../../src/guards/ws-throttle.guard';
import { ConfigModule } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';

const secret = 'test-secret-32-characters-minimum!!';

function createWsMockContext(overrides: {
  token?: string;
  authHeader?: string;
  clientId?: string;
}): ExecutionContext {
  return {
    switchToWs: () => ({
      getClient: () => ({
        id: overrides.clientId || 'test-client-1',
        data: {},
        handshake: {
          auth: { token: overrides.token },
          headers: {
            authorization: overrides.authHeader,
          },
        },
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('WebSocketLibModule (Integration)', () => {
  let module: TestingModule;
  let wsAuthGuard: WsAuthGuard;
  let wsThrottleGuard: WsThrottleGuard;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = secret;
    delete process.env.JWT_ACCESS_PUBLIC_KEY;

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        WebSocketLibModule,
      ],
    }).compile();

    wsAuthGuard = module.get<WsAuthGuard>(WsAuthGuard);
    wsThrottleGuard = module.get<WsThrottleGuard>(WsThrottleGuard);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(wsAuthGuard).toBeDefined();
    expect(wsThrottleGuard).toBeDefined();
  });

  describe('WsAuthGuard', () => {
    it('should throw WsException when no token is provided', () => {
      const context = createWsMockContext({});

      expect(() => wsAuthGuard.canActivate(context)).toThrow(WsException);
    });

    it('should allow access when token is in handshake auth', () => {
      const token = jwt.sign({ sub: 'user-1', role: 'USER' }, secret);
      const context = createWsMockContext({ token });

      const result = wsAuthGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow access when token is in authorization header', () => {
      const token = jwt.sign({ sub: 'user-2', role: 'USER' }, secret);
      const context = createWsMockContext({ authHeader: `Bearer ${token}` });

      const result = wsAuthGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw with correct error shape when unauthorized', () => {
      const context = createWsMockContext({});

      try {
        wsAuthGuard.canActivate(context);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error).toBeInstanceOf(WsException);
        const errorResponse = error.getError();
        expect(errorResponse.code).toBe('AUTH_WS_UNAUTHORIZED');
        expect(errorResponse.message).toContain('authentication required');
      }
    });
  });

  describe('WsThrottleGuard', () => {
    it('should allow requests below the rate limit', () => {
      const context = createWsMockContext({ clientId: `throttle-ws-${Date.now()}` });

      const result = wsThrottleGuard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should allow requests from different clients', () => {
      const ctx1 = createWsMockContext({ clientId: `ws-client-a-${Date.now()}` });
      const ctx2 = createWsMockContext({ clientId: `ws-client-b-${Date.now()}` });

      expect(wsThrottleGuard.canActivate(ctx1)).toBe(true);
      expect(wsThrottleGuard.canActivate(ctx2)).toBe(true);
    });

    it('should track request count per client', () => {
      const clientId = `ws-counter-${Date.now()}`;
      const context = createWsMockContext({ clientId });

      expect(wsThrottleGuard.canActivate(context)).toBe(true);
      expect(wsThrottleGuard.canActivate(context)).toBe(true);
    });
  });
});
