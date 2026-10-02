/**
 * Resolves which portal a login request belongs to from Origin / Referer /
 * X-Forwarded-Host / explicit body. App host → client; admin host → admin.
 *
 * Never trust the upstream `Host` header alone — after the gateway proxies to
 * auth (`nl-prod-auth:3001`), that Host includes `:3001` and would falsely
 * classify every login as admin.
 */

export type AuthPortal = 'client' | 'admin';

function hostFromUrlOrHeader(value: string | undefined): string {
  if (!value) return '';
  try {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return new URL(value).host.toLowerCase();
    }
  } catch {
    /* fall through */
  }
  return value.toLowerCase().replace(/^https?:\/\//, '').split('/')[0] || '';
}

function isLoopback(host: string): boolean {
  return host.startsWith('localhost') || host.startsWith('127.0.0.1');
}

function classifyHost(host: string): AuthPortal | null {
  if (!host) return null;

  // Public / branded hosts
  if (host === 'admin.nestlancer.com' || host.startsWith('admin.') || host.includes('.admin.')) {
    return 'admin';
  }
  if (
    host === 'app.nestlancer.com' ||
    host === 'web.nestlancer.com' ||
    host.startsWith('app.') ||
    host.startsWith('web.')
  ) {
    return 'client';
  }

  // Local frontend ports only (never treat the auth service listen port as a portal signal)
  if (isLoopback(host)) {
    if (host.endsWith(':9010') || host.endsWith(':3001')) {
      // :3001 is the *admin frontend* in local monorepo docs — only honor for loopback
      // Origin/Referer of the browser, not the auth container Host.
      return 'admin';
    }
    if (host.endsWith(':9000') || host.endsWith(':3000') || host === 'localhost' || host === '127.0.0.1') {
      return 'client';
    }
  }

  return null;
}

/**
 * Infer portal from browser-facing headers only (Origin → Referer → X-Forwarded-Host).
 * `host` is intentionally ignored — it is the proxied upstream Host after gateway.
 */
export function inferPortalFromOrigin(
  origin?: string,
  referer?: string,
  forwardedHost?: string,
): AuthPortal | null {
  for (const raw of [origin, referer, forwardedHost]) {
    const classified = classifyHost(hostFromUrlOrHeader(raw));
    if (classified) return classified;
  }
  return null;
}

/**
 * Binds login to a portal: Origin wins when present; body portal must not contradict Origin.
 */
export function resolveLoginPortal(options: {
  bodyPortal?: AuthPortal | null;
  origin?: string;
  referer?: string;
  host?: string;
  forwardedHost?: string;
}): AuthPortal {
  // Prefer browser Origin/Referer/X-Forwarded-Host. Ignore upstream Host (options.host).
  const fromOrigin = inferPortalFromOrigin(
    options.origin,
    options.referer,
    options.forwardedHost,
  );

  if (fromOrigin && options.bodyPortal && fromOrigin !== options.bodyPortal) {
    // Origin is authoritative for browser clients; reject spoofed portal claim
    return fromOrigin;
  }
  if (fromOrigin) return fromOrigin;
  if (options.bodyPortal) return options.bodyPortal;
  // Fail closed for unknown origin when portal omitted — treat as client (safer than unbound admin)
  return 'client';
}

export function portalAudience(portal: AuthPortal): string {
  return portal === 'admin' ? 'nestlancer-admin' : 'nestlancer-client';
}
