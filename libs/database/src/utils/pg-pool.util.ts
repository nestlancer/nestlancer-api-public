import { Pool, type PoolConfig } from 'pg';

function parseConnectionString(connectionString: string): {
  connectionString: string;
  useSsl: boolean;
} {
  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get('sslmode')?.toLowerCase();
    url.searchParams.delete('sslmode');
    return {
      connectionString: url.toString(),
      useSsl: !!sslmode && sslmode !== 'disable',
    };
  } catch {
    const useSsl =
      connectionString.includes('sslmode=require') || connectionString.includes('sslmode=prefer');
    const sanitized = connectionString.replace(/([?&])sslmode=[^&]*(&)?/, (_, prefix, suffix) => {
      if (prefix === '?' && suffix) return '?';
      if (prefix === '?' && !suffix) return '';
      if (prefix === '&') return suffix ? '&' : '';
      return '';
    });
    return { connectionString: sanitized, useSsl };
  }
}

/** Build a pg Pool that honours sslmode in DATABASE_URL (self-signed certs in dev).
 *
 * Reads pool-sizing env vars so containers can tune connection counts without a code change:
 *   DATABASE_POOL_MAX         – max connections per pool  (default: 5)
 *   DATABASE_POOL_MIN         – min idle connections      (default: 1)
 *   DATABASE_POOL_IDLE_MS     – idle connection timeout ms (default: 60000 = 60 s)
 *
 * Keeping the idle timeout at 60 s prevents the pool from closing idle connections
 * between 30-second dashboard polls, which caused a 288 ms TLS re-handshake on every
 * request and triggered the Slow-request warning at the 300 ms threshold.
 *
 * DATABASE_POOL_MAX is 10 in production. Postgres max_connections is 200 on the
 * primary and the replica, so a burst of per-thread reads can run in parallel
 * without queueing on a 5-connection pool.
 */
export function createPgPool(connectionString: string, overrides?: Partial<PoolConfig>): Pool {
  const { connectionString: sanitizedUrl, useSsl } = parseConnectionString(connectionString);
  const config: PoolConfig = {
    connectionString: sanitizedUrl,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    min: Number(process.env.DATABASE_POOL_MIN ?? 1),
    idleTimeoutMillis: Number(process.env.DATABASE_POOL_IDLE_MS ?? 60_000),
    ...overrides,
  };

  if (useSsl) {
    config.ssl = {
      rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
    };
  }

  return new Pool(config);
}
