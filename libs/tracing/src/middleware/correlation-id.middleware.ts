import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v7 as uuidv7 } from 'uuid';

import {
  normalizeCorrelationId,
  readActiveTraceIds,
  runWithLogContext,
  setLogContext,
} from '@nestlancer/common';

const API_VERSION = 'v1'; // Hardcoded to avoid circular dependency with @nestlancer/common

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Prefer an explicit correlation id; fall back to request-id, then generate.
    const correlationId =
      normalizeCorrelationId(req.headers['x-correlation-id']) ||
      normalizeCorrelationId(req.headers['x-request-id']) ||
      uuidv7();

    // NL-BUG-PERF-002: honour a client-supplied X-Request-ID when present and valid,
    // instead of always overwriting it with the correlation id.
    const inboundRequestId = normalizeCorrelationId(req.headers['x-request-id']);
    const requestId = inboundRequestId || correlationId;

    // Always a single string — never an array Express would later join with commas.
    req.headers['x-correlation-id'] = correlationId;
    req.headers['x-request-id'] = requestId;

    res.setHeader('X-Correlation-ID', correlationId);
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-API-Version', `v${API_VERSION.replace('v', '')}`);

    const trace = readActiveTraceIds();
    runWithLogContext({ correlationId, ...trace }, () => {
      // OTel HTTP instrumentation may attach the span just after middleware entry.
      // Re-capture on the next tick while ALS is still active for this request.
      queueMicrotask(() => {
        const again = readActiveTraceIds();
        if (again.traceId) setLogContext(again);
      });
      next();
    });
  }
}
