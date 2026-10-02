/**
 * Pick one request id from headers that may be a string, string[], or
 * comma-joined duplicates (Caddy append + app generate).
 *
 * Prefer the first token so a client-supplied id is echoed even when a proxy
 * later appends a server UUID (`AUDIT-TRACE-…, 1d3d750a-…`).
 * Reject overlong / non-trace values so they cannot flood logs or headers
 * (NL-BUG-API-103).
 */
export const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function isUsableCorrelationId(value: string): boolean {
  return CORRELATION_ID_PATTERN.test(value);
}

export function normalizeCorrelationId(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    const values = Array.isArray(candidate) ? candidate : [candidate];
    for (const value of values) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed || trimmed === '-') continue;
      const first = trimmed.split(',')[0]?.trim();
      if (first && isUsableCorrelationId(first)) return first;
    }
  }
  return undefined;
}
