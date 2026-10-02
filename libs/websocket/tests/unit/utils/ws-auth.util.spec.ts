import { attachAuthenticatedWsUser, extractWsToken } from '../../../src/utils/ws-auth.util';
import { installTestAccessKeys } from '../test-access-keys';

describe('ws-auth.util', () => {
  let signAccess: (payload: Record<string, unknown>) => string;

  beforeAll(() => {
    ({ signAccess } = installTestAccessKeys());
  });

  it('extractWsToken reads auth token from handshake', () => {
    const client = {
      handshake: { auth: { token: 'abc123' }, headers: {} },
      data: {},
    } as any;
    expect(extractWsToken(client)).toBe('abc123');
  });

  it('attachAuthenticatedWsUser decodes JWT and sets client.data.user', () => {
    const token = signAccess({ sub: 'user-42', role: 'ADMIN' });
    const client = {
      handshake: { auth: { token }, headers: {} },
      data: {},
    } as any;

    const user = attachAuthenticatedWsUser(client);
    expect(user.userId).toBe('user-42');
    expect(user.role).toBe('ADMIN');
    expect(client.data.user.userId).toBe('user-42');
  });

  it('accepts client-portal access tokens (nestlancer-client audience)', () => {
    const { generateKeyPairSync } = require('crypto');
    const jwt = require('jsonwebtoken');
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.JWT_ACCESS_PUBLIC_KEY = publicKey;
    process.env.JWT_CLIENT_AUDIENCE = 'nestlancer-client';
    const token = jwt.sign(
      { sub: 'client-1', role: 'USER', type: 'access' },
      privateKey,
      {
        algorithm: 'RS256',
        issuer: 'nestlancer-auth',
        audience: 'nestlancer-client',
        expiresIn: '15m',
      }
    );
    const client = {
      handshake: { auth: { token }, headers: {} },
      data: {},
    } as any;

    const user = attachAuthenticatedWsUser(client);
    expect(user.userId).toBe('client-1');
  });

  it('rejects refresh tokens', () => {
    const { generateKeyPairSync } = require('crypto');
    const jwt = require('jsonwebtoken');
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    process.env.JWT_ACCESS_PUBLIC_KEY = publicKey;
    const token = jwt.sign({ sub: 'user-42', role: 'ADMIN', type: 'refresh' }, privateKey, {
      algorithm: 'RS256',
      issuer: 'nestlancer-auth',
      audience: 'nestlancer-api',
      expiresIn: '15m',
    });
    const client = {
      handshake: { auth: { token }, headers: {} },
      data: {},
    } as any;
    expect(() => attachAuthenticatedWsUser(client)).toThrow();
  });
});
