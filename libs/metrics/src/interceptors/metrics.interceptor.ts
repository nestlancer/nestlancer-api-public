import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  OnModuleInit,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import * as client from 'prom-client';
import { httpRouteLabel } from '../http-route';
import { MetricsService } from '../metrics.service';

function readTraceId(): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const api = require('@opentelemetry/api') as {
      trace?: {
        getActiveSpan?: () => { spanContext?: () => { traceId?: string } } | undefined;
      };
    };
    const traceId = api.trace?.getActiveSpan?.()?.spanContext?.()?.traceId;
    if (!traceId || traceId === '00000000000000000000000000000000') return undefined;
    return traceId;
  } catch {
    return undefined;
  }
}

@Injectable()
export class MetricsInterceptor implements NestInterceptor, OnModuleInit {
  private requestsTotal!: client.Counter<string>;
  private requestDuration!: client.Histogram<string>;

  constructor(private readonly metrics: MetricsService) {}

  onModuleInit(): void {
    this.requestsTotal = this.metrics.createCounter(
      'nestlancer_http_requests_total',
      'Total HTTP requests',
      ['method', 'status', 'route'],
      { enableExemplars: true },
    );
    this.requestDuration = this.metrics.createHistogram(
      'nestlancer_http_request_duration_seconds',
      'HTTP request duration in seconds',
      ['method', 'route'],
      [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      { enableExemplars: true },
    );
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const start = Date.now();
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    let recorded = false;
    const record = (statusCode: number) => {
      if (recorded) return;
      recorded = true;
      this.record(req.method, statusCode, start, httpRouteLabel(req), readTraceId());
    };

    return next.handle().pipe(
      catchError((err) => {
        record(res.statusCode || 500);
        return throwError(() => err);
      }),
      finalize(() => {
        record(res.statusCode || 200);
      }),
    );
  }

  private record(
    method: string,
    statusCode: number,
    start: number,
    route = 'unknown',
    traceId?: string,
  ): void {
    const status = String(statusCode);
    const duration = (Date.now() - start) / 1000;
    const exemplarLabels = traceId ? { traceID: traceId } : undefined;
    this.requestsTotal.inc({
      labels: { method, status, route },
      exemplarLabels,
    });
    this.requestDuration.observe({
      labels: { method, route },
      value: duration,
      exemplarLabels,
    });
  }
}
