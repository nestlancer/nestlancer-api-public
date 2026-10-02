import { RequestLoggerMiddleware } from '@nestlancer/logger';

import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';

type HttpApp = {
  use: (...handlers: Array<(req: unknown, res: unknown, next: (err?: unknown) => void) => void>) => unknown;
};

/**
 * Attach a single correlation id and a JSON access log to every HTTP request.
 * Uses a structural app type so callers are not blocked by duplicate @nestjs/common
 * peer graphs across workspace packages.
 */
export function installHttpObservability(app: HttpApp): void {
  const correlation = new CorrelationIdMiddleware();
  const requestLogger = new RequestLoggerMiddleware();
  app.use((req: unknown, res: unknown, next: (err?: unknown) => void) =>
    correlation.use(req as never, res as never, next),
  );
  app.use((req: unknown, res: unknown, next: (err?: unknown) => void) =>
    requestLogger.use(req as never, res as never, next),
  );
}
