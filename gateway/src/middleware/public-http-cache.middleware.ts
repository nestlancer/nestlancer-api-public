import type { NextFunction, Request, Response } from 'express';

/**
 * Edge-cacheable public GET paths. Authenticated / personalized routes must
 * never match — Cloudflare would otherwise serve one client's JSON to another.
 *
 * Directives match the audit recommendation for NL-BUG-PERF-101:
 * browser 60s, edge 300s, stale-while-revalidate 600s.
 */
export const PUBLIC_HTTP_CACHE_CONTROL =
  'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

const PUBLIC_CACHE_PATHS: RegExp[] = [
  /^\/api\/v1\/portfolio\/?$/,
  /^\/api\/v1\/portfolio\/featured\/?$/,
  /^\/api\/v1\/portfolio\/categories\/?$/,
  /^\/api\/v1\/portfolio\/tags\/?$/,
  /^\/api\/v1\/portfolio\/timeline\/?$/,
  // Detail by id/slug — exclude /view and /like (mutating / personalized).
  /^\/api\/v1\/portfolio\/(?!featured\/?$|categories\/?$|tags\/?$|timeline\/?$|search\/?$)[^/]+\/?$/,
  /^\/api\/v1\/services\/?$/,
  /^\/api\/v1\/projects\/public\/?$/,
  /^\/api\/v1\/blog\/posts\/?$/,
  // Blog post detail — exclude /view and other action suffixes.
  /^\/api\/v1\/blog\/posts\/(?!feed\/)[^/]+\/?$/,
  /^\/api\/v1\/blog\/feed\/(rss|atom)\/?$/,
];

export function publicCacheControlFor(path: string): string | undefined {
  const normalized = path.split('?')[0] || path;
  return PUBLIC_CACHE_PATHS.some((re) => re.test(normalized))
    ? PUBLIC_HTTP_CACHE_CONTROL
    : undefined;
}

/** Nest mounts gateway middleware under `/api/v1`, so `req.path` is `/portfolio`. */
export function requestPathForCache(req: Pick<Request, 'originalUrl' | 'baseUrl' | 'path' | 'url'>): string {
  const raw = req.originalUrl || `${req.baseUrl || ''}${req.path || req.url || ''}`;
  return raw.split('?')[0] || '/';
}

function applyPublicCacheHeader(res: Response, statusCode: number, directive: string): void {
  if (res.headersSent || statusCode !== 200) return;
  res.setHeader('Cache-Control', directive);
  const vary = String(res.getHeader('Vary') || '');
  if (!/\bAccept-Encoding\b/i.test(vary)) {
    res.setHeader('Vary', vary ? `${vary}, Accept-Encoding` : 'Accept-Encoding');
  }
}

/**
 * Set Cache-Control on successful public GET responses so Cloudflare can
 * edge-cache them. Authenticated / personalized responses get no-store
 * (NL-BUG-PERF-001). The gateway rebuilds JSON envelopes, so downstream
 * Cache-Control headers would otherwise be dropped.
 *
 * Must hook `writeHead` (not only `end`): Nest/Express send headers inside
 * `res.json()` before `end`, so the previous `!headersSent` check on `end`
 * never ran (NL-BUG-PERF-101 still open after the first deploy).
 */
export function publicHttpCacheMiddleware(req: Request, res: Response, next: NextFunction): void {
  const isAuthenticated =
    Boolean(req.headers.authorization) ||
    (typeof req.headers.cookie === 'string' &&
      /(?:^|;\s*)(access_token|nl_session)=([^;]+)/.test(req.headers.cookie));

  if (isAuthenticated) {
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = ((statusCode: number, ...rest: unknown[]) => {
      if (!res.headersSent) {
        res.setHeader('Cache-Control', 'private, no-store');
      }
      return originalWriteHead(statusCode, ...(rest as []));
    }) as Response['writeHead'];

    const originalEnd = res.end.bind(res) as Response['end'];
    res.end = ((...args: Parameters<Response['end']>) => {
      if (!res.headersSent) {
        res.setHeader('Cache-Control', 'private, no-store');
      }
      return originalEnd(...args);
    }) as Response['end'];

    next();
    return;
  }

  if (req.method !== 'GET') {
    next();
    return;
  }

  const directive = publicCacheControlFor(requestPathForCache(req));
  if (!directive) {
    next();
    return;
  }

  const originalWriteHead = res.writeHead.bind(res);
  res.writeHead = ((statusCode: number, ...rest: unknown[]) => {
    applyPublicCacheHeader(res, statusCode, directive);
    return originalWriteHead(statusCode, ...(rest as []));
  }) as Response['writeHead'];

  const originalEnd = res.end.bind(res) as Response['end'];
  res.end = ((...args: Parameters<Response['end']>) => {
    applyPublicCacheHeader(res, res.statusCode || 200, directive);
    return originalEnd(...args);
  }) as Response['end'];

  next();
}
