/**
 * Resolve Socket.IO CORS origins for namespace gateways and the Redis adapter.
 * Production sets `CORS_ORIGINS`; legacy configs may use `ALLOWED_ORIGINS`.
 */
export function resolveSocketCorsOrigin():
  | string[]
  | boolean
  | ((origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => void) {
  const raw =
    process.env.CORS_ORIGINS?.trim() ||
    process.env.ALLOWED_ORIGINS?.trim() ||
    '';

  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.includes('*')) {
    // Reflect request origin (never literal '*' with credentials: true).
    return (origin, callback) => callback(null, true);
  }

  if (origins.length === 0) {
    // Fail closed in production; allow local/dev without an allowlist.
    if (process.env.NODE_ENV === 'production') {
      return (origin, callback) => {
        if (!origin) {
          // Same-origin / non-browser clients may omit Origin.
          return callback(null, true);
        }
        return callback(new Error('CORS origin not allowed'), false);
      };
    }
    return (origin, callback) => callback(null, true);
  }

  return origins;
}
