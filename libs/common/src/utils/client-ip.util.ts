import type { Request } from 'express';

/**
 * Normalizes a client IP for storage and display.
 * Strips IPv4-mapped IPv6 prefixes (e.g. ::ffff:192.168.1.1 → 192.168.1.1).
 */
export function normalizeIp(ip: string | undefined | null): string | null {
  if (ip == null) return null;

  let value = String(ip).trim();
  if (!value) return null;

  if (value.includes(',')) {
    value = value.split(',')[0].trim();
  }

  const ipv4Mapped = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (ipv4Mapped) return ipv4Mapped[1];

  if (value === '::1') return '127.0.0.1';

  return value;
}

/** True for loopback / RFC1918 / link-local addresses (Docker bridge hops, etc.). */
export function isPrivateOrLocalIp(ip: string): boolean {
  if (ip === '127.0.0.1' || ip === '0.0.0.0' || ip === '::' || ip === '::1') return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  const m = ip.match(/^172\.(\d+)\./);
  if (m) {
    const second = Number(m[1]);
    if (second >= 16 && second <= 31) return true;
  }
  // Unique-local IPv6 (fc00::/7) and link-local fe80::/10
  const lower = ip.toLowerCase();
  if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:')) return true;
  return false;
}

/**
 * Resolves the originating client IP from an Express request.
 * Prefers Cloudflare / public proxy headers over private Docker hops when
 * Express `req.ip` only saw an internal address.
 */
export function getClientIp(req: Pick<Request, 'ip' | 'headers' | 'socket'>): string | null {
  const headers = req.headers ?? {};
  const cfConnectingIp = headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    const normalized = normalizeIp(
      Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : String(cfConnectingIp),
    );
    if (normalized) return normalized;
  }

  const reqIp = req.ip ? normalizeIp(req.ip) : null;
  if (reqIp && !isPrivateOrLocalIp(reqIp)) return reqIp;

  const xRealIp = headers['x-real-ip'];
  if (xRealIp) {
    const normalized = normalizeIp(Array.isArray(xRealIp) ? xRealIp[0] : String(xRealIp));
    if (normalized && !isPrivateOrLocalIp(normalized)) return normalized;
  }

  const xForwardedFor = headers['x-forwarded-for'];
  if (xForwardedFor) {
    const raw = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    // Prefer the leftmost public hop in the chain.
    const parts = String(raw)
      .split(',')
      .map((p) => normalizeIp(p.trim()))
      .filter((p): p is string => Boolean(p));
    const publicHop = parts.find((p) => !isPrivateOrLocalIp(p));
    if (publicHop) return publicHop;
    if (parts[0]) return parts[0];
  }

  if (reqIp) return reqIp;

  if (xRealIp) {
    const normalized = normalizeIp(Array.isArray(xRealIp) ? xRealIp[0] : String(xRealIp));
    if (normalized) return normalized;
  }

  return normalizeIp(req.socket?.remoteAddress ?? null);
}
