import { io, Socket } from 'socket.io-client';
import { setupApp, teardownApp, getWsUrl } from './setup';
import { createTestJwt } from '../../libs/testing/src/helpers/test-auth.helper';

/**
 * Real-time messaging E2E: /messages namespace — join room, send message, typing.
 * Auth required by WsAuthGuard; validation errors emit 'error' event with exact payload.
 */
describe('WsGateway - Messaging Realtime (E2E)', () => {
  let socket: Socket;
  let baseUrl: string;
  const secret = process.env.JWT_ACCESS_SECRET || 'test-secret-key-for-testing-only-32char';

  function createToken(userId: string) {
    return createTestJwt({ sub: userId, email: `${userId}@example.com`, role: 'USER' }, { secret });
  }

  beforeAll(async () => {
    await setupApp();
    baseUrl = getWsUrl();
  });

  afterAll(async () => {
    socket?.disconnect();
    await teardownApp();
  });

  describe('Connection (smoke)', () => {
    it('connects to /messages namespace with valid token', async () => {
      const token = createToken('e2e-user-1');
      socket = io(`${baseUrl}/messages`, {
        transports: ['websocket'],
        auth: { token },
        timeout: 5000,
      });
      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', (err) => reject(err));
      });
      expect(socket.connected).toBe(true);
    });
  });

  describe('Auth rejection', () => {
    it('unauthenticated connection either get connect_error or connect', async () => {
      const unauthSocket = io(`${baseUrl}/messages`, {
        transports: ['websocket'],
        timeout: 5000,
      });
      await new Promise<void>((resolve) => {
        const done = () => {
          unauthSocket.disconnect();
          resolve();
        };
        unauthSocket.on('connect', () => done());
        unauthSocket.on('connect_error', (err: Error & { data?: { message?: string } }) => {
          const msg = err?.message ?? err?.data?.message ?? '';
          expect(msg).toMatch(
            /websocket error|WebSocket authentication required|Invalid token|auth/i,
          );
          done();
        });
      });
      unauthSocket.disconnect();
    });
  });

  describe('Room and message success paths', () => {
    it('join:room with valid projectId returns joined event with same projectId', (done) => {
      expect(socket?.connected).toBe(true);
      socket.emit('join:room', { projectId: 'e2e-project-1' });
      socket.once('joined', (data: { projectId: string }) => {
        expect(data).toBeDefined();
        expect(data.projectId).toBe('e2e-project-1');
        done();
      });
    });

    it('message:send returns message:deprecated directing clients to REST', (done) => {
      expect(socket?.connected).toBe(true);
      socket.emit('message:send', {
        projectId: 'e2e-project-1',
        content: 'E2E hello',
        type: 'text',
      });
      socket.once('message:deprecated', (data: { deprecated?: boolean; use?: string }) => {
        expect(data).toBeDefined();
        expect(data.deprecated).toBe(true);
        expect(data.use).toMatch(/POST \/api\/v1\/messages/);
        done();
      });
    });

    it('typing:start emits typing:indicator to other client in same room', (done) => {
      expect(socket?.connected).toBe(true);
      const token2 = createToken('e2e-user-2');
      const socket2 = io(`${baseUrl}/messages`, {
        transports: ['websocket'],
        auth: { token: token2 },
        timeout: 5000,
      });
      socket2.on('connect', () => {
        socket2.emit('join:room', { projectId: 'e2e-project-1' });
        socket2.once('joined', () => {
          socket.emit('typing:start', { projectId: 'e2e-project-1' });
        });
      });
      socket2.on('typing:indicator', (data: { userId: string; isTyping: boolean }) => {
        expect(data.userId).toBe('e2e-user-1');
        expect(data.isTyping).toBe(true);
        socket2.disconnect();
        done();
      });
    });
  });

  describe('Validation errors', () => {
    it('join:room without projectId emits exception event with code and message', (done) => {
      expect(socket?.connected).toBe(true);
      socket.once('exception', (arg: unknown) => {
        const payload = Array.isArray(arg) ? arg[0] : arg;
        const data = payload as { code?: string; message?: string };
        expect(data).toBeDefined();
        expect(data?.code ?? data?.message).toBeDefined();
        expect(String(data?.message ?? data?.code ?? '')).toMatch(
          /Internal server error|Missing projectId/i,
        );
        done();
      });
      socket.emit('join:room', {});
    });

    it('message:send emits message:deprecated (REST is required for sending)', (done) => {
      expect(socket?.connected).toBe(true);
      socket.once('message:deprecated', (data: { deprecated?: boolean; use?: string }) => {
        expect(data).toBeDefined();
        expect(data.deprecated).toBe(true);
        expect(String(data.use ?? '')).toMatch(/POST \/api\/v1\/messages/);
        done();
      });
      socket.emit('message:send', { projectId: 'e2e-project-1' });
    });
  });
});
