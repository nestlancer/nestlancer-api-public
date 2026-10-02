import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Build the gateway CORS options.
 *
 * When `origins` is empty, contains the wildcard sentinel `*`, or otherwise
 * cannot constrain to a fixed set (e.g. dev with rolling Tailscale/LAN IPs),
 * we fall back to a callback that reflects the request origin. This keeps
 * `credentials: true` working (real wildcard `*` is incompatible with
 * credentials) while staying permissive for dev. Production should always
 * pass an explicit allowlist.
 */
export function getCorsConfig(origins: string[]): CorsOptions {
  const reflectAll = origins.length === 0 || origins.includes('*');

  return {
    origin: reflectAll ? (origin, callback) => callback(null, origin ?? true) : origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Correlation-ID',
      'X-Request-ID',
      'X-Idempotency-Key',
      'X-Turnstile-Token',
    ],
    exposedHeaders: [
      'X-Correlation-ID',
      'X-Request-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ],
    credentials: true,
    maxAge: 86400,
  };
}
