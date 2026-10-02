import { WsException } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

export type WsAuthenticatedUser = {
  userId: string;
  role?: string;
};

export function extractWsToken(client: Socket): string | undefined {
  const raw =
    client.handshake?.auth?.token ||
    client.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, '');
  const token = typeof raw === 'string' ? raw.trim() : '';
  return token || undefined;
}

/** Verifies JWT from the Socket.IO handshake and attaches `client.data.user`. */
export function attachAuthenticatedWsUser(client: Socket): WsAuthenticatedUser {
  const existing = client.data?.user as WsAuthenticatedUser | undefined;
  if (existing?.userId) return existing;

  const token = extractWsToken(client);
  if (!token) {
    throw new WsException({
      code: 'AUTH_WS_UNAUTHORIZED',
      message: 'WebSocket authentication required',
    });
  }

  const publicKey = (process.env.JWT_ACCESS_PUBLIC_KEY ?? '').replace(/\\n/g, '\n').trim();
  if (!publicKey.includes('BEGIN PUBLIC KEY')) {
    throw new WsException({
      code: 'AUTH_WS_UNAUTHORIZED',
      message: 'JWT verification key not configured',
    });
  }

  const issuer = process.env.JWT_ISSUER || 'nestlancer-auth';
  const audiences = [
    process.env.JWT_CLIENT_AUDIENCE || 'nestlancer-client',
    process.env.JWT_ADMIN_AUDIENCE || 'nestlancer-admin',
    process.env.JWT_AUDIENCE || 'nestlancer-api',
  ] as [string, ...string[]];

  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      issuer,
      audience: audiences,
    }) as jwt.JwtPayload;
  } catch {
    throw new WsException({
      code: 'AUTH_WS_UNAUTHORIZED',
      message: 'Invalid token',
    });
  }

  if (decoded.type && decoded.type !== 'access') {
    throw new WsException({
      code: 'AUTH_WS_UNAUTHORIZED',
      message: 'Invalid token type',
    });
  }

  const userId = typeof decoded.sub === 'string' ? decoded.sub : undefined;
  if (!userId) {
    throw new WsException({
      code: 'AUTH_WS_UNAUTHORIZED',
      message: 'Invalid token payload',
    });
  }

  const user: WsAuthenticatedUser = {
    userId,
    role: typeof decoded.role === 'string' ? decoded.role : 'USER',
  };
  client.data = client.data || {};
  client.data.user = user;
  return user;
}
