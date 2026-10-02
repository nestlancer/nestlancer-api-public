import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ApiResponse, ResponseMetadata } from '../types/api-response.type';
import { API_VERSION } from '../constants/app.constants';
import { isPublicDocumentationPath } from '../constants/swagger.constants';

/**
 * Prefer the public gateway path (`/api/v1/...`) over the rewritten internal
 * path (`/api/...`) so metadata.path matches the URL clients actually called.
 * Only a gateway-injected header is trusted — clients cannot set it.
 */
export function resolveResponsePath(request: {
  url?: string;
  originalUrl?: string;
  headers?: Record<string, string | string[] | undefined>;
}): string {
  const headers = request.headers ?? {};
  const source = headers['x-gateway-source'];
  const published = headers['x-public-path'];
  const gateway = Array.isArray(source) ? source[0] : source;
  const publicPath = Array.isArray(published) ? published[0] : published;
  if (
    gateway === 'nestlancer-gateway' &&
    typeof publicPath === 'string' &&
    publicPath.startsWith('/') &&
    !publicPath.includes('..') &&
    !/[\r\n]/.test(publicPath)
  ) {
    return publicPath.split('?')[0] || publicPath;
  }
  const raw = request.originalUrl || request.url || '';
  return raw.split('?')[0] || raw;
}

/**
 * Wraps all successful responses in standard API envelope per 100-api-standards.
 */
@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path ?? request.url ?? '';

    // Swagger UI and docs-specs proxies must return raw JSON/HTML (often via @Res()).
    if (isPublicDocumentationPath(path)) {
      return next.handle();
    }

    context.switchToHttp().getResponse<Response>();

    const metadata: ResponseMetadata = {
      timestamp: new Date().toISOString(),
      // Prefer X-Request-ID when the client supplied one (NL-BUG-PERF-002).
      requestId:
        (request.headers['x-request-id'] as string) ||
        (request.headers['x-correlation-id'] as string) ||
        '',
      version: `v${API_VERSION.replace('v', '')}`,
      path: resolveResponsePath(request),
    };

    return next.handle().pipe(
      map((data) => {
        // If the data already has our envelope shape, return as-is
        if (data && typeof data === 'object' && 'status' in data && data.status === 'success') {
          return data;
        }

        return {
          status: 'success' as const,
          data,
          metadata,
        };
      }),
    );
  }
}
