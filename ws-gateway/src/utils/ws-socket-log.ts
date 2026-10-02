import { randomUUID } from 'crypto';
import { Socket } from 'socket.io';

import { normalizeCorrelationId, runWithLogContext, writeLog } from '@nestlancer/common';

type SocketData = {
  user?: { userId?: string };
  correlationId?: string;
};

function socketUserId(client: Socket): string | undefined {
  const userId = (client.data as SocketData | undefined)?.user?.userId;
  return userId ? String(userId) : undefined;
}

/** Resolve or mint a single correlation id for this socket and stash it on client.data. */
export function ensureSocketCorrelationId(client: Socket): string {
  const data = (client.data ??= {}) as SocketData;
  const existing = normalizeCorrelationId(data.correlationId);
  if (existing) return existing;

  const fromHandshake = normalizeCorrelationId(
    client.handshake?.headers?.['x-correlation-id'],
    client.handshake?.headers?.['x-request-id'],
    (client.handshake?.auth as { correlationId?: unknown } | undefined)?.correlationId,
  );
  const correlationId = fromHandshake || randomUUID();
  data.correlationId = correlationId;
  return correlationId;
}

export async function runWithSocketLogContext<T>(
  client: Socket,
  fn: () => T | Promise<T>,
): Promise<T> {
  const correlationId = ensureSocketCorrelationId(client);
  const userId = socketUserId(client);
  return runWithLogContext({ correlationId, userId }, fn);
}

export function logSocketLifecycle(
  event: 'ws.connect' | 'ws.disconnect' | 'ws.auth_failed',
  client: Socket,
  namespace: string,
  level: 'info' | 'warn' | 'error' = 'info',
  err?: unknown,
): void {
  const correlationId = ensureSocketCorrelationId(client);
  const userId = socketUserId(client);
  const message =
    event === 'ws.connect'
      ? `WS connected ${namespace} ${client.id}`
      : event === 'ws.disconnect'
        ? `WS disconnected ${namespace} ${client.id}`
        : `WS auth failed ${namespace} ${client.id}`;

  runWithLogContext({ correlationId, userId }, () => {
    writeLog(level, message, {
      context: 'WS',
      event,
      correlationId,
      userId,
      path: namespace,
    });
    if (err && level === 'error') {
      const stack = err instanceof Error ? err.stack : undefined;
      if (stack) writeLog('error', stack, { context: 'WS', event, correlationId, userId });
    }
  });
}
