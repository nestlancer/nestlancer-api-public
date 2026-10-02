import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { ServerOptions } from 'socket.io';

function resolveSocketCorsOrigin():
  | string[]
  | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void) {
  const origins =
    process.env.CORS_ORIGINS?.split(',')
      .map((o) => o.trim())
      .filter(Boolean) ?? [];

  if (origins.length === 0 || origins.includes('*')) {
    return (_origin, callback) => callback(null, true);
  }
  return origins;
}

export class RedisIoAdapter extends IoAdapter {
  constructor(app: INestApplication) {
    super(app);
  }
  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      cors: { origin: resolveSocketCorsOrigin(), credentials: true },
    });
    // In production: configure with Redis pub/sub adapter for multi-instance support
    return server;
  }
}
