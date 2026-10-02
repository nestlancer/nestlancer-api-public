import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import {
  normalizeCorrelationId,
  readActiveTraceIds,
  redactUrlForLogging,
} from '@nestlancer/common';

import { runWithLogContext, setLogContext } from '../log-context';
import { writeLog } from '../write-log';

type RequestUser = { id?: string; sub?: string; userId?: string };

function headerValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed || undefined;
}

function userIdFromRequest(req: Request): string | undefined {
  const user = (req as Request & { user?: RequestUser }).user;
  const fromUser = user?.id || user?.sub || user?.userId;
  if (fromUser) return String(fromUser);
  // Downstream services receive verified identity via gateway-injected x-user-id
  // (req.user is often unset there). Never trust this on the public edge alone.
  return headerValue(req.headers['x-user-id']);
}

/**
 * Skip liveness/readiness, per-service `/…/health` probes, and Prometheus scrapes.
 * Still log diagnostic routes like `/health/detailed`, `/health/debug`, etc.
 */
function isHealthProbePath(path: string | undefined): boolean {
  if (!path) return false;
  const p = path.split('?')[0].toLowerCase().replace(/\/+$/, '') || '/';
  if (
    /\/health\/(detailed|debug|database|cache|queue|storage|microservices|external|workers|websocket|system|features|registry|dependencies|services)(\/|$)/.test(
      p,
    )
  ) {
    return false;
  }
  return (
    /\/(healthz?|readyz?|livez?|ping|metrics)$/.test(p) ||
    /\/health$/.test(p) ||
    /\/health\/(live|ready|startup|ping)$/.test(p)
  );
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (isHealthProbePath(req.path) || isHealthProbePath(req.originalUrl)) return next();
    const start = process.hrtime.bigint();
    const correlationId =
      normalizeCorrelationId(req.headers['x-correlation-id'], req.headers['x-request-id']) || '-';
    const safeUrl = redactUrlForLogging(req.originalUrl || req.url || '');

    // Capture trace IDs while the OTel HTTP span is still active. `res.on('finish')`
    // often runs after the span ends, which previously dropped traceId on ~30% of lines.
    const earlyTrace = readActiveTraceIds();
    let capturedTraceId = earlyTrace.traceId;
    let capturedSpanId = earlyTrace.spanId;

    runWithLogContext(
      {
        correlationId: correlationId === '-' ? undefined : correlationId,
        userId: userIdFromRequest(req),
        traceId: capturedTraceId,
        spanId: capturedSpanId,
      },
      () => {
        queueMicrotask(() => {
          const again = readActiveTraceIds();
          if (again.traceId) {
            capturedTraceId = again.traceId;
            capturedSpanId = again.spanId;
            setLogContext(again);
          }
        });

        res.on('finish', () => {
          // Auth guards run after this middleware — read userId when the response finishes.
          const userId = userIdFromRequest(req);
          const live = readActiveTraceIds();
          const traceId = live.traceId || capturedTraceId;
          const spanId = live.spanId || capturedSpanId;
          if (userId) setLogContext({ userId });
          if (traceId) setLogContext({ traceId, spanId });

          const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
          const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
          writeLog(
            level,
            `${req.method} ${safeUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms [${correlationId}]`,
            {
              context: 'HTTP',
              event: 'http.request',
              correlationId: correlationId === '-' ? undefined : correlationId,
              userId,
              traceId,
              spanId,
              method: req.method,
              path: safeUrl,
              status: res.statusCode,
              durationMs: Number(durationMs.toFixed(1)),
            },
          );
        });
        next();
      },
    );
  }
}
