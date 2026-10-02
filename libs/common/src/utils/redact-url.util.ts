const SENSITIVE_QUERY_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'turnstiletoken',
  'secret',
  'authorization',
  'api_key',
  'apikey',
  'code',
  'key',
  'jwt',
  'session',
  'sig',
  'signature',
]);

/**
 * Redacts sensitive query parameter values before logging URLs.
 * Path segments are left intact; only known-sensitive query keys are masked.
 */
export function redactUrlForLogging(rawUrl: string): string {
  const qIndex = rawUrl.indexOf('?');
  if (qIndex === -1) return rawUrl;

  const path = rawUrl.slice(0, qIndex);
  const query = rawUrl.slice(qIndex + 1);
  if (!query) return path;

  const redacted = query
    .split('&')
    .map((pair) => {
      const eq = pair.indexOf('=');
      if (eq === -1) return pair;
      const key = decodeURIComponent(pair.slice(0, eq));
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        return `${key}=***REDACTED***`;
      }
      return pair;
    })
    .join('&');

  return `${path}?${redacted}`;
}
