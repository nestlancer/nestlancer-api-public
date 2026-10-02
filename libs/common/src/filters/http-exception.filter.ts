import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

import { redactUrlForLogging } from '../utils/redact-url.util';

/**
 * HTTP-specific exception filter for standard NestJS HttpExceptions.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exResponse = exception.getResponse();
    const correlationId = (request.headers['x-correlation-id'] as string) || 'unknown';

    const message =
      typeof exResponse === 'string'
        ? exResponse
        : (exResponse as Record<string, unknown>).message || exception.message;

    this.logger.warn(
      `HTTP ${status} on ${request.method} ${redactUrlForLogging(request.url)}: ${message}`,
    );

    response.status(status).json({
      status: 'error',
      error: {
        code: `HTTP_${status}`,
        message: Array.isArray(message) ? message.join(', ') : message,
        timestamp: new Date().toISOString(),
        requestId: correlationId,
        path: request.url,
      },
    });
  }
}
