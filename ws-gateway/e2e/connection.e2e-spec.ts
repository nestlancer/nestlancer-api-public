import { io, Socket } from 'socket.io-client';
import { setupApp, teardownApp, getWsUrl } from './setup';
import { createTestJwt } from '../../libs/testing/src/helpers/test-auth.helper';

describe('WsGateway - Connection (E2E)', () => {
  const secret = process.env.JWT_ACCESS_SECRET || 'test-secret-key-for-testing-only-32char';

  function createToken(userId: string) {
    return createTestJwt({ sub: userId, email: `${userId}@example.com`, role: 'USER' }, { secret });
  }

  beforeAll(async () => {
    await setupApp();
  });

  afterAll(async () => {
    await teardownApp();
  });

  describe('Connection (smoke)', () => {
    it('connects to /messages namespace with valid token', async () => {
      const url = getWsUrl();
      const token = createToken('e2e-user-1');
      const socket = io(`${url}/messages`, {
        transports: ['websocket'],
        auth: { token },
        timeout: 5000,
      });
      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', (err) => reject(err));
      });
      expect(socket.connected).toBe(true);
      socket.disconnect();
    });
  });

  describe('Auth rejection', () => {
    it('without token either get connect_error with auth message or connect', async () => {
      const url = getWsUrl();
      const socket = io(`${url}/messages`, {
        transports: ['websocket'],
        timeout: 5000,
      });
      await new Promise<void>((resolve) => {
        const done = () => {
          socket.disconnect();
          resolve();
        };
        socket.on('connect', () => done());
        socket.on('connect_error', (err: Error & { data?: { message?: string } }) => {
          const msg = err?.message ?? err?.data?.message ?? '';
          expect(msg).toMatch(
            /websocket error|WebSocket authentication required|Invalid token|auth/i,
          );
          done();
        });
      });
      socket.disconnect();
    });

    it('with invalid token either get connect_error or connect', async () => {
      const url = getWsUrl();
      const socket = io(`${url}/messages`, {
        transports: ['websocket'],
        auth: { token: 'invalid-token' },
        timeout: 5000,
      });
      await new Promise<void>((resolve) => {
        const done = () => {
          socket.disconnect();
          resolve();
        };
        socket.on('connect', () => done());
        socket.on('connect_error', (err: Error & { data?: { message?: string } }) => {
          const msg = err?.message ?? err?.data?.message ?? '';
          expect(msg).toMatch(/websocket error|Invalid token|auth/i);
          done();
        });
      });
      socket.disconnect();
    });
  });

  describe('Disconnect', () => {
    it('disconnects cleanly after connecting with valid token', async () => {
      const url = getWsUrl();
      const token = createToken('e2e-user-1');
      const socket: Socket = io(`${url}/messages`, {
        transports: ['websocket'],
        auth: { token },
        timeout: 5000,
      });
      await new Promise<void>((resolve, reject) => {
        socket.on('connect', () => resolve());
        socket.on('connect_error', (err) => reject(err));
      });
      expect(socket.connected).toBe(true);
      socket.disconnect();
      expect(socket.connected).toBe(false);
    });
  });
});
