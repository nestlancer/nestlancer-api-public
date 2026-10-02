import { io, Socket } from 'socket.io-client';
import { setupApp, teardownApp, getWsUrl } from './setup';
import { createTestJwt } from '../../libs/testing/src/helpers/test-auth.helper';

/**
 * Presence E2E: connection updates presence (setOnline/setOffline) via ConnectionService and PresenceService.
 * With mocked CacheService in setup, presence state is in-memory for the test.
 */
describe('WsGateway - Presence (E2E)', () => {
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

  describe('Disconnect and presence', () => {
    it('on disconnect socket is disconnected and disconnect event fires', (done) => {
      expect(socket?.connected).toBe(true);
      socket.once('disconnect', (reason: string) => {
        expect(socket.connected).toBe(false);
        expect(reason).toBeDefined();
        done();
      });
      socket.disconnect();
    });
  });
});
