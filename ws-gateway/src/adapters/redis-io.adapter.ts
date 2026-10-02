import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import type { Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { INestApplication, Logger } from '@nestjs/common';
import { NestlancerConfigService } from '@nestlancer/config';
import * as jwt from 'jsonwebtoken';

import { resolveSocketCorsOrigin } from '../utils/ws-cors';

export class CustomRedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;
  private readonly logger = new Logger(CustomRedisIoAdapter.name);

  constructor(private app: INestApplication) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const configService = this.app.get(NestlancerConfigService);
    const redisUrl = configService.redisPubSubUrl;

    this.logger.log(`Connecting to Redis for WebSockets at ${redisUrl}...`);

    const pubClient = new Redis(redisUrl);
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.ping(), subClient.ping()]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Redis pub/sub adapter connected successfully.');
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const socketPath =
      process.env.SOCKET_IO_PATH?.trim() ||
      process.env.NEXT_PUBLIC_SOCKET_IO_PATH?.trim() ||
      '/ws/socket.io';

    const server = super.createIOServer(port, {
      ...options,
      path: socketPath,
      transports: ['websocket', 'polling'],
      cors: {
        origin: resolveSocketCorsOrigin(),
        credentials: true,
      },
      // Protocol: ping every 30s, disconnect if no pong within 10s
      pingInterval: 30_000,
      pingTimeout: 10_000,
      // Reject unauthenticated Engine.IO handshakes before issuing a sid (NL-REALTIME-002).
      // Prefer access_token cookie or Authorization header. Clients may send `auth=1` as a
      // non-secret marker that a JWT will follow in the Socket.IO `auth` payload
      // (NL-BUG-PAY-003 — never require the JWT itself in the query string).
      // Legacy `?token=` is still accepted temporarily for older clients.
      allowRequest: (
        req: { headers?: Record<string, unknown>; url?: string },
        callback: (err: string | null | undefined, success: boolean) => void,
      ) => {
        const authHeader = req.headers?.authorization;
        const tokenFromHeader =
          typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
        const url = typeof req.url === 'string' ? req.url : '';
        let tokenFromQuery = '';
        let authMarker = false;
        try {
          const q = new URL(url, 'http://localhost').searchParams;
          tokenFromQuery = (q.get('token') || q.get('access_token') || '').trim();
          authMarker = q.get('auth') === '1';
        } catch {
          /* ignore */
        }
        const cookieHeader = typeof req.headers?.cookie === 'string' ? req.headers.cookie : '';
        const hasAccessCookie = /(?:^|;\s*)access_token=([^;]+)/.test(cookieHeader);
        if (!tokenFromHeader && !tokenFromQuery && !hasAccessCookie && !authMarker) {
          return callback('WebSocket authentication required', false);
        }
        return callback(null, true);
      },
    });

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    } else {
      this.logger.warn('Redis adapter not initialized. Fallback to in-memory adapter.');
    }

    server.use((socket: Socket, next: (err?: Error) => void) => {
      const raw =
        socket.handshake?.auth?.token ||
        (typeof socket.handshake?.query?.token === 'string'
          ? socket.handshake.query.token
          : '') ||
        (typeof socket.handshake?.headers?.authorization === 'string'
          ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
          : '');
      const token = typeof raw === 'string' ? raw.trim() : '';
      if (!token) {
        return next(new Error('WebSocket authentication required'));
      }

      const publicKey = (process.env.JWT_ACCESS_PUBLIC_KEY ?? '').replace(/\\n/g, '\n').trim();
      if (!publicKey.includes('BEGIN PUBLIC KEY')) {
        return next(new Error('JWT verification key not configured'));
      }

      try {
        const decoded = jwt.verify(token, publicKey, {
          algorithms: ['RS256'],
          issuer: process.env.JWT_ISSUER || 'nestlancer-auth',
          audience: [
            process.env.JWT_CLIENT_AUDIENCE || 'nestlancer-client',
            process.env.JWT_ADMIN_AUDIENCE || 'nestlancer-admin',
            'nestlancer-api',
          ],
        }) as jwt.JwtPayload;

        if (decoded.type && decoded.type !== 'access') {
          return next(new Error('Invalid token type'));
        }
        const userId = typeof decoded.sub === 'string' ? decoded.sub : undefined;
        if (!userId) {
          return next(new Error('Invalid token payload'));
        }
        socket.data = socket.data || {};
        socket.data.user = {
          userId,
          role: typeof decoded.role === 'string' ? decoded.role : 'USER',
        };
        return next();
      } catch {
        return next(new Error('Invalid token'));
      }
    });

    return server;
  }
}
