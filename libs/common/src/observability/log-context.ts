import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  jobId?: string;
  paymentId?: string;
  event?: string;
  /** Captured at request/message start — survives response `finish` when the OTel span is gone. */
  traceId?: string;
  spanId?: string;
}

const storage = new AsyncLocalStorage<LogContext>();

export function getLogContext(): LogContext {
  return storage.getStore() ?? {};
}

export function runWithLogContext<T>(context: LogContext, fn: () => T): T {
  const parent = storage.getStore() ?? {};
  return storage.run({ ...parent, ...context }, fn);
}

export function setLogContext(patch: LogContext): void {
  const store = storage.getStore();
  if (!store) return;
  Object.assign(store, patch);
}
