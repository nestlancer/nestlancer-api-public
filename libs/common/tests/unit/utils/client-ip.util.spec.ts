import type { Request } from 'express';

import { getClientIp, isPrivateOrLocalIp, normalizeIp } from '../../../src/utils/client-ip.util';

describe('normalizeIp', () => {
  it('strips IPv4-mapped IPv6 prefix', () => {
    expect(normalizeIp('::ffff:172.18.0.11')).toBe('172.18.0.11');
  });

  it('maps IPv6 loopback to IPv4 loopback', () => {
    expect(normalizeIp('::1')).toBe('127.0.0.1');
  });

  it('uses the first IP from a comma-separated list', () => {
    expect(normalizeIp('203.0.113.1, 10.0.0.1')).toBe('203.0.113.1');
  });

  it('returns null for empty values', () => {
    expect(normalizeIp('')).toBeNull();
    expect(normalizeIp(null)).toBeNull();
  });
});

describe('isPrivateOrLocalIp', () => {
  it('detects Docker / RFC1918 ranges', () => {
    expect(isPrivateOrLocalIp('172.18.0.1')).toBe(true);
    expect(isPrivateOrLocalIp('10.0.0.5')).toBe(true);
    expect(isPrivateOrLocalIp('192.168.1.1')).toBe(true);
    expect(isPrivateOrLocalIp('127.0.0.1')).toBe(true);
  });

  it('allows public addresses', () => {
    expect(isPrivateOrLocalIp('203.0.113.50')).toBe(false);
    expect(isPrivateOrLocalIp('8.235.26.166')).toBe(false);
  });
});

describe('getClientIp', () => {
  const baseReq = {
    ip: '::ffff:172.18.0.11',
    headers: {},
    socket: { remoteAddress: '::ffff:172.18.0.11' },
  } as Pick<Request, 'ip' | 'headers' | 'socket'>;

  it('prefers Cloudflare connecting IP', () => {
    const req = {
      ...baseReq,
      headers: {
        'cf-connecting-ip': '203.0.113.9',
        'x-forwarded-for': '203.0.113.50, 10.0.0.1',
      },
    };
    expect(getClientIp(req)).toBe('203.0.113.9');
  });

  it('skips private req.ip and uses public X-Forwarded-For', () => {
    const req = {
      ...baseReq,
      headers: { 'x-forwarded-for': '203.0.113.50, 10.0.0.1' },
    };
    expect(getClientIp(req)).toBe('203.0.113.50');
  });

  it('prefers public Express req.ip over spoofable X-Forwarded-For', () => {
    const req = {
      ...baseReq,
      ip: '198.51.100.20',
      headers: { 'x-forwarded-for': '203.0.113.50, 10.0.0.1' },
    };
    expect(getClientIp(req)).toBe('198.51.100.20');
  });

  it('falls back to X-Real-IP when req.ip is absent', () => {
    const req = {
      ...baseReq,
      ip: undefined as unknown as string,
      headers: { 'x-real-ip': '198.51.100.10' },
    };
    expect(getClientIp(req)).toBe('198.51.100.10');
  });

  it('falls back to private req.ip when no public proxy header exists', () => {
    expect(getClientIp(baseReq)).toBe('172.18.0.11');
  });
});
