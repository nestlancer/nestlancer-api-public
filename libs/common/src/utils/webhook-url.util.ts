import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { isPrivateOrLocalIp } from './client-ip.util';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'kubernetes.default',
  'kubernetes.default.svc',
]);

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '').toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return true;
  if (host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return true;
  }
  return false;
}

/**
 * NL-BUG-HOOK-001: reject webhook targets that resolve to loopback, link-local,
 * or RFC1918 addresses (latent SSRF once delivery workers are enabled).
 */
export async function assertSafeWebhookUrl(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('Webhook URL is not a valid absolute URL');
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Webhook URL must use http or https');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, '');
  if (!hostname) {
    throw new Error('Webhook URL must include a hostname');
  }

  if (isBlockedHostname(hostname)) {
    throw new Error('Webhook URL hostname is not allowed');
  }

  if (isIP(hostname)) {
    if (isPrivateOrLocalIp(hostname)) {
      throw new Error('Webhook URL must not target a private or link-local address');
    }
    return;
  }

  let address: string;
  try {
    const result = await lookup(hostname, { all: false });
    address = result.address;
  } catch {
    throw new Error('Webhook URL hostname could not be resolved');
  }

  if (isPrivateOrLocalIp(address)) {
    throw new Error('Webhook URL must not resolve to a private or link-local address');
  }
}
