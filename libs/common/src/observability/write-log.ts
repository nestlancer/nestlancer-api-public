import { getLogContext } from './log-context';
import { normalizeCorrelationId } from './correlation-id';

export type LogLevel = 'info' | 'error' | 'warn' | 'debug' | 'verbose';

export interface LogFields {
  context?: string;
  trace?: string;
  event?: string;
  correlationId?: string;
  userId?: string;
  jobId?: string;
  paymentId?: string;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  /** Prefer explicit IDs captured at request start over a live span that may already be ended. */
  traceId?: string;
  spanId?: string;
}

/** Read the active OTel span if present (empty when tracing is off or the span already ended). */
export function readActiveTraceIds(): { traceId?: string; spanId?: string } {
  try {
    // Optional at runtime. Not a package dependency of common.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const api = require('@opentelemetry/api') as {
      trace?: {
        getActiveSpan?: () => { spanContext?: () => { traceId?: string; spanId?: string } } | undefined;
      };
    };
    const span = api.trace?.getActiveSpan?.();
    const ctx = span?.spanContext?.();
    if (!ctx?.traceId || ctx.traceId === '00000000000000000000000000000000') return {};
    return { traceId: ctx.traceId, spanId: ctx.spanId };
  } catch {
    return {};
  }
}

function resolveTraceIds(fields: LogFields): { traceId?: string; spanId?: string } {
  const live = readActiveTraceIds();
  const ctx = getLogContext();
  return {
    traceId: fields.traceId || live.traceId || ctx.traceId,
    spanId: fields.spanId || live.spanId || ctx.spanId,
  };
}

function omitEmpty(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return out;
}

export function serviceName(): string {
  return process.env.OTEL_SERVICE_NAME || process.env.APP_NAME || 'nestlancer';
}

export function writeLog(level: LogLevel, message: string, fields: LogFields = {}): void {
  const ctx = getLogContext();
  const trace = resolveTraceIds(fields);
  const line = JSON.stringify(
    omitEmpty({
      level,
      message,
      timestamp: new Date().toISOString(),
      service: serviceName(),
      context: fields.context,
      event: fields.event || ctx.event,
      correlationId: normalizeCorrelationId(
        fields.correlationId,
        ctx.correlationId,
      ),
      traceId: trace.traceId,
      spanId: trace.spanId,
      userId: fields.userId || ctx.userId,
      jobId: fields.jobId || ctx.jobId,
      paymentId: fields.paymentId || ctx.paymentId,
      method: fields.method,
      path: fields.path,
      status: fields.status,
      durationMs: fields.durationMs,
      trace: fields.trace,
    }),
  );

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else if (level === 'debug') console.debug(line);
  else console.log(line);
}
