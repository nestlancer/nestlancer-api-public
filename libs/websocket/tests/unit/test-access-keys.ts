import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';

export function installTestAccessKeys() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  process.env.JWT_ACCESS_PUBLIC_KEY = publicKey;
  process.env.JWT_ISSUER = 'nestlancer-auth';
  process.env.JWT_AUDIENCE = 'nestlancer-api';
  delete process.env.JWT_ACCESS_SECRET;
  return {
    signAccess(payload: Record<string, unknown>) {
      return jwt.sign({ ...payload, type: 'access' }, privateKey, {
        algorithm: 'RS256',
        issuer: 'nestlancer-auth',
        audience: 'nestlancer-api',
        expiresIn: '15m',
      });
    },
  };
}
