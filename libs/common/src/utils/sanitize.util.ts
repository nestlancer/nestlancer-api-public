/** Escape HTML special characters in user-controlled strings (XSS defence for HTML sinks). */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize free-text message / note content before persistence.
 * Strips tags/scripts so React text nodes stay readable while HTML sinks stay safe.
 */
export function sanitizeUserContent(input: string, maxLength = 5000): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?[a-z][^>]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLength);
}

/** Masks sensitive fields in objects for logging */
export function maskSensitiveFields(
  obj: Record<string, unknown>,
  fields: string[] = ['password', 'token', 'secret', 'authorization', 'cookie', 'creditCard'],
): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (fields.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      masked[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      masked[key] = maskSensitiveFields(value as Record<string, unknown>, fields);
    } else {
      masked[key] = value;
    }
  }
  return masked;
}
