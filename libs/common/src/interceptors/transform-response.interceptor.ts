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

/** Envelope keys that are part of the wrapper itself, not of the payload. */
const ENVELOPE_KEYS = new Set(['status', 'data', 'metadata']);

/**
 * Normalises any controller return value into the standard
 * `{ status, data, metadata }` envelope (NL-BUG-API-ENV-001).
 *
 * Previously the interceptor passed a value straight through whenever it merely
 * carried `status: 'success'`. 169 controllers hand-build that shape, and 56 of
 * them supply no `data` key at all — so those endpoints went out with no `data`
 * and no `metadata` (losing `requestId`, which production tracing depends on).
 * `GET /api/v1/admin/payments` was returning `{ status, items, meta }` on live.
 *
 * Rules:
 * - A complete envelope (`status` + `data` + `metadata`) is returned untouched.
 * - A partial envelope keeps its `data` and gains the missing `metadata`.
 * - A partial envelope with no `data` has its non-envelope keys folded into
 *   `data`, so `{ status, items, meta }` becomes `{ status, data: { items, meta }, metadata }`.
 * - Anything else is wrapped as `data` as before.
 *
 * `metadata` supplied by a controller wins, so deliberate overrides still work.
 */
export function normalizeSuccessEnvelope<T>(
  payload: unknown,
  metadata: ResponseMetadata,
): ApiResponse<T> {
  const isEnvelopeLike =
    payload !== null &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    (payload as Record<string, unknown>).status === 'success';

  if (!isEnvelopeLike) {
    return { status: 'success', data: payload as T, metadata };
  }

  const source = payload as Record<string, unknown>;

  // Already a complete, well-formed envelope — leave it exactly as it is.
  if ('data' in source && 'metadata' in source) {
    return source as unknown as ApiResponse<T>;
  }

  if ('data' in source) {
    return {
      status: 'success',
      data: source.data as T,
      metadata: (source.metadata as ResponseMetadata) ?? metadata,
    };
  }

  // No `data` key: treat the remaining own keys as the payload.
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!ENVELOPE_KEYS.has(key)) rest[key] = value;
  }

  return {
    status: 'success',
    data: rest as T,
    metadata: (source.metadata as ResponseMetadata) ?? metadata,
  };
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
      map((payload) => normalizeSuccessEnvelope(payload, metadata)),
    );
  }
}
