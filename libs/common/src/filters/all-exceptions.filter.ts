import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseAppException } from '../exceptions/base.exception';

/**
 * Global exception filter that catches ALL exceptions and formats them
 * per 100-api-standards error response envelope.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let code: string;
    let message: string;
    let details: unknown[] | undefined;

    if (exception instanceof BaseAppException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse() as Record<string, unknown>;
      const error = errorResponse.error as Record<string, unknown>;
      code = error.code as string;
      message = error.message as string;
      details = error.details as unknown[] | undefined;
    } else if (
      exception instanceof HttpException ||
      (exception &&
        typeof (exception as HttpException).getStatus === 'function' &&
        typeof (exception as HttpException).getResponse === 'function')
    ) {
      const httpEx = exception as HttpException;
      status = httpEx.getStatus();
      const exResponse = httpEx.getResponse();

      // Preserve intentional partial success payloads (e.g. legacy 2FA challenge throws).
      if (exResponse && typeof exResponse === 'object') {
        const partial = exResponse as Record<string, unknown>;
        if (partial.status === 'partial' && partial.data != null) {
          response.status(status).json(exResponse);
          return;
        }
      }

      if (typeof exResponse === 'string') {
        message = exResponse;
        code = `HTTP_${status}`;
      } else {
        const res = exResponse as Record<string, unknown>;
        const nestedError = res?.error as Record<string, unknown> | undefined;
        const rawMessage = res?.message ?? nestedError?.message ?? res?.error;
        message =
          (typeof rawMessage === 'string' ? rawMessage : undefined) ??
          (Array.isArray(rawMessage) ? 'Request validation failed' : undefined) ??
          'Unknown error';
        // Preserve custom error code from guard/exception when provided
        const customCode = (nestedError?.code as string) ?? (res?.code as string) ?? undefined;
        code = customCode ?? `HTTP_${status}`;
        const proxiedDetails = nestedError?.details ?? res?.details;
        if (Array.isArray(proxiedDetails) && proxiedDetails.length > 0) {
          details = proxiedDetails;
        } else if (Array.isArray(rawMessage)) {
          details = rawMessage.map((item) =>
            typeof item === 'string' ? { message: item } : item,
          );
        }
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = 'An unexpected error occurred';
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const correlationId = (request.headers['x-correlation-id'] as string) || 'unknown';

    if (
      status === HttpStatus.TOO_MANY_REQUESTS ||
      status === HttpStatus.SERVICE_UNAVAILABLE
    ) {
      const retryAfter = this.resolveRetryAfter(exception, details);
      if (retryAfter > 0) {
        response.setHeader('Retry-After', String(retryAfter));
      }
    }

    response.status(status).json({
      status: 'error',
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        requestId: correlationId,
        path: request.url,
      },
    });
  }

  private resolveRetryAfter(exception: unknown, details: unknown[] | undefined): number {
    if (exception instanceof BaseAppException && 'retryAfter' in exception) {
      const value = (exception as { retryAfter?: number }).retryAfter;
      if (typeof value === 'number' && value > 0) return value;
    }

    if (exception instanceof HttpException) {
      const exResponse = exception.getResponse();
      if (typeof exResponse === 'object' && exResponse !== null) {
        const res = exResponse as Record<string, unknown>;
        const nested = res.error as Record<string, unknown> | undefined;
        const retryAfter = nested?.retryAfter ?? res.retryAfter;
        if (typeof retryAfter === 'number' && retryAfter > 0) return retryAfter;
      }
    }

    const detail = details?.[0] as { retryAfter?: number } | undefined;
    if (detail?.retryAfter && detail.retryAfter > 0) return detail.retryAfter;

    return 0;
  }
}
