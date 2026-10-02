/**
 * E2E setup: bootstraps the WebSocket Gateway app (no Redis adapter; default in-memory).
 * Mocks CacheService and RedisSubscriberService so connection/presence work without Redis.
 */
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

process.env.NODE_ENV = process.env.NODE_ENV || 'e2e';
dotenv.config({
  path: path.resolve(__dirname, '../../.env.e2e'),
});

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WsExceptionFilter } from '../src/filters/ws-exception.filter';
import { WsAppModule } from '../src/app.module';
import { CacheService } from '@nestlancer/cache';
import { RedisSubscriberService } from '../src/services/redis-subscriber.service';
import { WsAuthGuard } from '@nestlancer/websocket';
import { WsException } from '@nestjs/websockets';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');

const mockRedisClient = () => {
  const store: Record<string, string> = {};
  const sets: Record<string, Set<string>> = {};
  return {
    get: jest.fn().mockImplementation((k: string) => Promise.resolve(store[k] ?? null)),
    set: jest.fn().mockImplementation((k: string, v: string) => {
      store[k] = v;
      return Promise.resolve('OK');
    }),
    del: jest.fn().mockImplementation((k: string) => {
      delete store[k];
      delete sets[k];
      return Promise.resolve(1);
    }),
    sadd: jest.fn().mockImplementation((k: string, ...members: string[]) => {
      if (!sets[k]) sets[k] = new Set();
      members.forEach((m) => sets[k].add(m));
      return Promise.resolve(1);
    }),
    srem: jest.fn().mockImplementation((k: string, ...members: string[]) => {
      if (!sets[k]) return Promise.resolve(0);
      members.forEach((m) => sets[k].delete(m));
      return Promise.resolve(1);
    }),
    scard: jest.fn().mockImplementation((k: string) => Promise.resolve(sets[k]?.size ?? 0)),
    smembers: jest
      .fn()
      .mockImplementation((k: string) => Promise.resolve(Array.from(sets[k] ?? []))),
    expire: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockImplementation((pattern: string) => {
      const prefix = pattern.replace('*', '');
      return Promise.resolve(
        [...Object.keys(store), ...Object.keys(sets)].filter((k) => k.startsWith(prefix)),
      );
    }),
  };
};

let app: INestApplication;

export async function setupApp(): Promise<INestApplication> {
  const client = mockRedisClient();

  const moduleRef = await Test.createTestingModule({
    imports: [WsAppModule],
  })
    .overrideProvider(CacheService)
    .useValue({ getClient: () => client })
    .overrideProvider(RedisSubscriberService)
    .useValue({
      onModuleInit: jest.fn(),
      onModuleDestroy: jest.fn(),
      subscribeMessagingChatChannel: jest.fn(),
    })
    .overrideGuard(WsAuthGuard)
    .useValue({
      canActivate: (context: any) => {
        const client = context.switchToWs().getClient();
        const token =
          client.handshake?.auth?.token ||
          client.handshake?.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          throw new WsException({
            code: 'AUTH_WS_UNAUTHORIZED',
            message: 'WebSocket authentication required',
          });
        }

        try {
          const secret = process.env.JWT_ACCESS_SECRET || 'test-secret-key-for-testing-only-32char';
          const decoded = jwt.verify(token, secret) as any;
          client.data = client.data || {};
          client.data.user = { userId: decoded.sub, role: decoded.role || 'USER' };
          return true;
        } catch (err) {
          throw new WsException({
            code: 'AUTH_WS_UNAUTHORIZED',
            message: 'Invalid token',
          });
        }
      },
    })
    .compile();

  app = moduleRef.createNestApplication() as unknown as INestApplication;
  app.useGlobalFilters(new WsExceptionFilter());
  await app.init();
  await app.listen(0);
  return app;
}

export async function teardownApp(): Promise<void> {
  await app?.close();
}

export function getApp(): INestApplication {
  if (!app) {
    throw new Error('App has not been initialized. Call setupApp() first.');
  }
  return app;
}

export function getWsUrl(): string {
  const server = app.getHttpServer();
  const address = server.address() as { port: number };
  return `http://localhost:${address.port}`;
}
