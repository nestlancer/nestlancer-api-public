import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import {
  getClientIp,
  isRateLimitEnabled,
  parseEnvPositiveInt,
  parseEnvString,
} from '@nestlancer/common';

type Bucket = { count: number; resetAt: number };

/**
 * Ops/seed bypass: shared secret header skips throttle (not public).
 * Prefer seeding via direct microservice URLs (docker network) instead.
 */
function hasSeedBypass(req: { headers?: Record<string, unknown> }): boolean {
  const expected = parseEnvString(
    process.env.SEED_BYPASS_TOKEN || process.env.TURNSTILE_BYPASS_TOKEN || '',
  );
  if (!expected) return false;
  const raw = req.headers?.['x-nestlancer-seed-token'];
  const got = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '');
  return got.length > 0 && got === expected;
}

function resolveAuthLimit(): number {
  // Prefer explicit AUTH limit; fall back to anonymous burst, then 10.
  const primary = parseEnvString(process.env.RATE_LIMIT_AUTH_LIMIT);
  if (primary) return parseEnvPositiveInt(primary, 10);
  return parseEnvPositiveInt(process.env.RATE_LIMIT_ANONYMOUS_BURST, 10);
}

function resolveUserLimit(): number {
  return parseEnvPositiveInt(process.env.RATE_LIMIT_USER, 1000);
}

function resolveAnonymousLimit(): number {
  const primary = parseEnvString(process.env.RATE_LIMIT_LIMIT);
  if (primary) return parseEnvPositiveInt(primary, 100);
  return parseEnvPositiveInt(process.env.RATE_LIMIT_ANONYMOUS, 100);
}

function resolveShareLimit(): number {
  return parseEnvPositiveInt(process.env.RATE_LIMIT_SHARE, 30);
}

function resolveWindowMs(): number {
  return parseEnvPositiveInt(process.env.RATE_LIMIT_TTL, 60) * 1000;
}

/**
 * In-memory gateway throttle (per process).
 * Controlled entirely by env (`RATE_LIMIT_ENABLED`, `RATE_LIMIT_*`).
 * Prefer Redis-backed limits for multi-replica production; this still blocks
 * obvious burst abuse on a single gateway instance.
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly windowMs = resolveWindowMs();
  private readonly anonymousMax = resolveAnonymousLimit();
  private readonly userMax = resolveUserLimit();
  /** Auth endpoints: prefer explicit AUTH limit, else a tight default for brute-force protection. */
  private readonly authMax = resolveAuthLimit();
  private readonly shareMax = resolveShareLimit();
  private readonly requests = new Map<string, Bucket>();

  canActivate(context: ExecutionContext): boolean {
    // Master switch — must honor Infisical RATE_LIMIT_ENABLED (incl. quoted values).
    if (!isRateLimitEnabled()) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    if (hasSeedBypass(req)) {
      return true;
    }
    // Match originalUrl as well as path — some proxies leave path without /auth/login.
    const path = String(req.originalUrl || req.url || req.path || '').toLowerCase();
    const clientIp = getClientIp(req) || req.ip || 'unknown';
    const userId = req.user?.userId as string | undefined;
    const isAuthSensitive =
      path.includes('/auth/login') ||
      path.includes('/auth/register') ||
      path.includes('/auth/forgot-password') ||
      path.includes('/auth/resend-verification') ||
      path.includes('/auth/refresh');
    const isShareProbe = /\/share\/[^/?#]+/.test(path);

    let limit: number;
    let bucketKind: string;
    let userKey: string;
    if (isAuthSensitive) {
      limit = this.authMax;
      bucketKind = 'auth';
      userKey = clientIp;
    } else if (isShareProbe) {
      limit = this.shareMax;
      bucketKind = 'share';
      userKey = clientIp;
    } else if (userId) {
      limit = this.userMax;
      bucketKind = 'user';
      userKey = userId;
    } else {
      limit = this.anonymousMax;
      bucketKind = 'anon';
      userKey = clientIp;
    }

    const key = `${bucketKind}:${userKey}`;
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetAt) {
      this.requests.set(key, { count: 1, resetAt: now + this.windowMs });
      this.setRateLimitHeaders(res, limit, limit - 1, this.windowMs);
      return true;
    }

    if (record.count >= limit) {
      const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      res?.setHeader?.('Retry-After', String(retryAfter));
      res?.setHeader?.('X-RateLimit-Limit', String(limit));
      res?.setHeader?.('X-RateLimit-Remaining', '0');
      res?.setHeader?.('X-RateLimit-Reset', String(Math.ceil(record.resetAt / 1000)));
      throw new HttpException(
        {
          status: 'error',
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Retry after ${retryAfter}s`,
            retryAfter,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    this.setRateLimitHeaders(res, limit, limit - record.count, record.resetAt - now);
    return true;
  }

  private setRateLimitHeaders(
    res: { setHeader?: (name: string, value: string) => void } | undefined,
    limit: number,
    remaining: number,
    resetMs: number,
  ): void {
    if (!res?.setHeader) return;
    res.setHeader('X-RateLimit-Limit', String(limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, remaining)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil((Date.now() + resetMs) / 1000)));
  }
}
