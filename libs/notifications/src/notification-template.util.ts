/** Substitutes `{{variable}}` placeholders in notification copy. */
export function renderNotificationTemplate(
  template: string,
  vars: Record<string, unknown>,
): string {
  const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const value = vars[key];
    if (value == null) return '';
    const text = String(value).trim();
    return text;
  });
  // Collapse empty placeholder remnants: "message on ." / "status changed to ." / "for ."
  return rendered
    .replace(/\s*\(\s*\)/g, '')
    .replace(/\s+(on|to|for|in|from|at)\s+[.\u2026]+\s*$/gi, '.')
    .replace(/\s+(on|to|for|in|from|at)\s*$/gi, '')
    .replace(/\s+(on|to|for|in|from|at)\s+\./gi, '.')
    .replace(/\s+of\s+(for|was|is|has)\b/gi, ' $1')
    .replace(/\s+for\s+(was|is|has)\b/gi, ' $1')
    .replace(/\s+on\s+(was|is|has)\b/gi, ' $1')
    .replace(/Your request\s+"\s*"\s*/gi, 'Your request ')
    .replace(/:\s*""\s*$/g, '.')
    .replace(/:\s*"\s*"\s*$/g, '.')
    .replace(/^\s*sent a message\b/i, 'You have a new message')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\./g, '.')
    .replace(/\.\.+/g, '.')
    .trim();
}

/** Humanize SCREAMING_SNAKE / camel enums for notification copy (NL-NOTIF-002). */
export function humanizeStatusLabel(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return 'updated';
  const spaced = raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Prefer mapper fallback copy when the DB template collapses because required
 * placeholders were empty (NL-NOTIF-002).
 */
export function preferMapperCopyWhenSparse(
  template: string,
  vars: Record<string, unknown>,
  rendered: string,
  mapperCopy: string | undefined,
): string {
  const fallback = typeof mapperCopy === 'string' ? mapperCopy.trim() : '';
  if (!fallback) return rendered;
  const placeholders = [...template.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!);
  // Static templates with no placeholders still lose richer mapper copy (amount/project).
  if (placeholders.length === 0) {
    return fallback.length > rendered.trim().length ? fallback : rendered;
  }
  const missingRequired = placeholders.some((key) => {
    const value = vars[key];
    return value == null || String(value).trim() === '';
  });
  if (!missingRequired) return rendered;
  if (fallback.length > rendered.trim().length) return fallback;
  return rendered;
}

/** Parses `NOTIFICATIONS_ENABLED_TYPES=type.a,type.b` into a set, or null when unset (allow all). */
export function parseEnabledNotificationTypes(raw?: string): Set<string> | null {
  if (!raw?.trim()) return null;
  const types = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return types.length > 0 ? new Set(types) : null;
}

export function isNotificationTypeAllowed(
  notificationType: string,
  allowlist: Set<string> | null,
): boolean {
  if (!allowlist) return true;
  return allowlist.has(notificationType);
}
