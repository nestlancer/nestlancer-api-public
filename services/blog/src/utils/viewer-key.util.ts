import { createHash } from 'crypto';
import type { Request } from 'express';

import { getClientIp } from '@nestlancer/common';

function bearerFingerprint(headers: Request['headers'] | undefined): string | null {
  const raw = headers?.authorization;
  if (!raw || Array.isArray(raw)) return null;
  const match = raw.match(/^Bearer\s+(\S+)/i);
  if (!match?.[1]) return null;
  return createHash('sha256').update(match[1]).digest('hex').slice(0, 24);
}

/**
 * Stable per-viewer key for debouncing blog post views.
 * Authenticated readers are keyed by user id (or bearer fingerprint) so distinct
 * accounts on the same NAT each count. Anonymous readers are keyed by client IP
 * only — User-Agent is trivial to rotate and was used to inflate view counts.
 */
export function buildViewerKey(
  req: Pick<Request, 'ip' | 'headers' | 'socket'> & { user?: { userId?: string; sub?: string; id?: string } },
  userId?: string,
): string {
  const identity =
    userId?.trim() ||
    req.user?.userId ||
    req.user?.sub ||
    req.user?.id ||
    null;
  if (identity) {
    return createHash('sha256').update(`user:${identity}`).digest('hex').slice(0, 32);
  }

  const tokenKey = bearerFingerprint(req.headers);
  if (tokenKey) {
    return createHash('sha256').update(`token:${tokenKey}`).digest('hex').slice(0, 32);
  }

  // IP only — User-Agent is trivial to rotate and was used to inflate view counts.
  const ip = getClientIp(req) ?? 'unknown';
  return createHash('sha256').update(`ip:${ip}`).digest('hex').slice(0, 32);
}
