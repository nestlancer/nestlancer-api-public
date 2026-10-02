/**
 * HTTP base-URL helpers for system smoke tests.
 *
 * All defaults match the port assignments in `.env.e2e` so that running
 * `pnpm test:system` without any override just works when the stack is up.
 *
 * Override via environment variables — no hardcoded non-localhost IPs.
 */

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Root URL of the API gateway (e.g. "http://localhost:4000").
 *
 * When gateway runs on another host (Tailscale, staging VM, etc.), set either:
 *   • `GATEWAY_URL` — full base URL, e.g. `http://100.x.x.x:4000`, or
 *   • `GATEWAY_HOST` — hostname/IP with optional `GATEWAY_PORT` (default `4000`).
 */
export function getGatewayUrl(): string {
  const explicit = process.env.GATEWAY_URL?.trim();
  if (explicit) {
    return stripTrailingSlash(explicit);
  }
  const port = process.env.GATEWAY_PORT || '4000';
  const host = process.env.GATEWAY_HOST || 'localhost';
  return `http://${host}:${port}`;
}

/**
 * Root URL of the WebSocket gateway (Socket.io base URL, no path).
 *
 * When ws-gateway runs elsewhere, set either:
 *   • `WS_GATEWAY_URL` — full base URL, e.g. `http://100.x.x.x:4100`, or
 *   • `WS_HOST` with optional `WS_PORT` (default `4100`).
 */
export function getWsGatewayUrl(): string {
  const explicit = process.env.WS_GATEWAY_URL?.trim();
  if (explicit) {
    return stripTrailingSlash(explicit);
  }
  const port = process.env.WS_PORT || '4100';
  const host = process.env.WS_HOST || 'localhost';
  return `http://${host}:${port}`;
}

/**
 * Full base path for versioned API calls.
 * Matches the global prefix configured in both gateway and per-package E2E setups.
 */
export const API_BASE = '/api/v1';

/** Convenience: gateway base URL + versioned API path prefix. */
export function getApiBase(): string {
  return `${getGatewayUrl()}${API_BASE}`;
}

/**
 * Base URL for admin routes proxied outside the versioned `/api/v1` namespace.
 * The admin service uses global prefix `api` (no /v1).  Depending on gateway
 * proxy strip configuration the external path may be either `/api/admin` or
 * `/api/v1/admin`.  Use `getAdminBase()` when you need the `/api/admin` form.
 */
export function getAdminBase(): string {
  return `${getGatewayUrl()}/api/admin`;
}

/**
 * The API gateway wraps ALL upstream responses — including 4xx and 5xx errors —
 * inside a HTTP 200 envelope:
 *
 *   { "status": "success", "data": { "status": "error", "error": { "code": "AUTH_001", ... } } }
 *
 * This helper inspects that envelope and returns the effective business status code
 * so that e2e test assertions can use standard HTTP semantics (401, 403, 404 …)
 * without knowing whether the gateway proxied the response or short-circuited it.
 *
 * Code prefix → HTTP status mapping (extend as new codes are introduced):
 *   AUTH_*            → 401  (missing / invalid token)
 *   FORBIDDEN_*       → 403  (insufficient role)
 *   HTTP_404 / *_NOT_FOUND / RESOURCE_NOT_FOUND → 404
 *   VALIDATION_* / INVALID_* / BAD_REQUEST → 400
 *   CONFLICT_* / DUPLICATE_* → 409
 *
 * If no inner error is detected the original httpStatus is returned unchanged.
 */
export function resolveStatus(httpStatus: number, data: unknown): number {
  // The gateway often uses HTTP 200 for error envelopes, but some routes return 201/204 with the same shape.
  if (httpStatus < 200 || httpStatus >= 300) return httpStatus;

  const inner = (data as any)?.data;

  // Nest HttpException / NotFoundException shape inside gateway envelope:
  // { status: "success", data: { statusCode: 404, message: "...", error: "Not Found" } }
  if (
    inner &&
    typeof inner === 'object' &&
    typeof inner.statusCode === 'number' &&
    inner.statusCode >= 400 &&
    inner.statusCode < 600
  ) {
    return inner.statusCode;
  }

  let code = '';
  if (inner && typeof inner === 'object' && inner.status === 'error') {
    code = String(inner?.error?.code ?? '');
  } else if (
    inner &&
    typeof inner === 'object' &&
    typeof (inner as { code?: unknown }).code === 'string' &&
    (inner as { message?: unknown }).message !== undefined
  ) {
    // Flat error object inside gateway envelope (some proxies omit `status: "error"`):
    // { status: "success", data: { code: "AUTH_001", message: "..." } }
    code = (inner as { code: string }).code;
  } else {
    return httpStatus;
  }

  if (!code) return httpStatus;

  const httpLiteral = /^HTTP_(\d{3})$/i.exec(code);
  if (httpLiteral) {
    const n = Number(httpLiteral[1]);
    if (n >= 400 && n < 600) return n;
  }

  // Turnstile / captcha required — treated as validation (matches e2e expectations for register/contact).
  if (/^AUTH_011$/i.test(code)) return 400;
  // Role errors use AUTH_* prefix — classify as 403 before generic AUTH_ → 401.
  if (/INSUFFICIENT_ROLE/i.test(code) || /^AUTH_0(03|14)$/i.test(code)) return 403;
  if (/^AUTH_/i.test(code) || /UNAUTHORIZED/i.test(code) || /MISSING_AUTH/i.test(code)) return 401;
  if (/^WEBHOOK_001$/i.test(code)) return 400;
  if (/^FORBIDDEN/i.test(code) || /PERMISSION_DENIED/i.test(code)) return 403;
  if (
    /^REQUEST_001$/i.test(code) ||
    /^REQUEST_012$/i.test(code) ||
    /^PROJECT_001$/i.test(code) ||
    /^QUOTE_001$/i.test(code) ||
    /^HTTP_404/i.test(code) ||
    /NOT_FOUND/i.test(code) ||
    /RESOURCE_NOT_FOUND/i.test(code)
  )
    return 404;
  if (/^VALIDATION_/i.test(code) || /^INVALID_/i.test(code) || /^BAD_REQUEST/i.test(code))
    return 400;
  if (/^CONFLICT/i.test(code) || /^DUPLICATE/i.test(code)) return 409;

  return httpStatus;
}
