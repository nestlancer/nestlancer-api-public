import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

import { normalizeCorrelationId } from '../observability/correlation-id';
import { runWithLogContext } from '../observability/log-context';
import { writeLog } from '../observability/write-log';
import { redactUrlForLogging } from '../utils/redact-url.util';

/**
 * Logs request processing duration for observability.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method } = request;
    const url = redactUrlForLogging(request.url);
    const correlationId =
      normalizeCorrelationId(request.headers['x-correlation-id'], request.headers['x-request-id']) ||
      '-';
    const startTime = Date.now();

    const resolveUserId = (): string | undefined => {
      const user = (request as Request & { user?: { id?: string; sub?: string; userId?: string } })
        .user;
      const userId = user?.id || user?.sub || user?.userId;
      if (userId) return String(userId);
      const header = request.headers['x-user-id'];
      const raw = Array.isArray(header) ? header[0] : header;
      return raw?.trim() || undefined;
    };

    return runWithLogContext(
      {
        correlationId: correlationId === '-' ? undefined : correlationId,
        userId: resolveUserId(),
      },
      () =>
        next.handle().pipe(
          tap({
            next: () => {
              const duration = Date.now() - startTime;
              const response = context.switchToHttp().getResponse();
              const userId = resolveUserId();
              writeLog(
                'info',
                `${method} ${url} ${response.statusCode} ${duration}ms [${correlationId}]`,
                {
                  context: 'HTTP',
                  event: 'http.request',
                  correlationId: correlationId === '-' ? undefined : correlationId,
                  userId,
                  method,
                  path: url,
                  status: response.statusCode,
                  durationMs: duration,
                },
              );
              const slowMs = Number(process.env.SLOW_REQUEST_MS ?? 1000);
              if (duration > slowMs) {
                writeLog('warn', `Slow request: ${method} ${url} took ${duration}ms`, {
                  context: 'HTTP',
                  event: 'http.slow',
                  correlationId: correlationId === '-' ? undefined : correlationId,
                  userId,
                  method,
                  path: url,
                  durationMs: duration,
                });
              }
              const res = response as Response;
              if (
                process.env.NODE_ENV === 'development' &&
                typeof res.setHeader === 'function' &&
                !res.headersSent
              ) {
                res.setHeader('X-Response-Time', `${duration}ms`);
              }
            },
            error: (err: Error) => {
              const duration = Date.now() - startTime;
              const userId = resolveUserId();
              writeLog(
                'error',
                `${method} ${url} ERROR ${duration}ms [${correlationId}]: ${err.message}`,
                {
                  context: 'HTTP',
                  event: 'http.error',
                  correlationId: correlationId === '-' ? undefined : correlationId,
                  userId,
                  method,
                  path: url,
                  durationMs: duration,
                  trace: err.stack,
                },
              );
            },
          }),
        ),
    );
  }
}
