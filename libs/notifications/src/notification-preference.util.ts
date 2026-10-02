const TYPE_CATEGORY_PREFIXES: Array<{ prefix: string; category: string }> = [
  { prefix: 'quote.', category: 'quotes' },
  { prefix: 'payment.', category: 'payments' },
  { prefix: 'message.', category: 'messages' },
  { prefix: 'project.', category: 'projects' },
  { prefix: 'request.', category: 'requests' },
  { prefix: 'milestone.', category: 'projects' },
  { prefix: 'revision.', category: 'projects' },
  { prefix: 'deliverable.', category: 'projects' },
  { prefix: 'progress.', category: 'projects' },
  { prefix: 'export.', category: 'account' },
  { prefix: 'document.', category: 'account' },
  { prefix: 'account.', category: 'account' },
  { prefix: 'security.', category: 'account' },
  { prefix: 'contact.', category: 'account' },
  { prefix: 'comment.', category: 'account' },
  { prefix: 'media.', category: 'account' },
  { prefix: 'system.', category: 'system' },
];

export function resolvePreferenceCategory(notificationType: string): string {
  const match = TYPE_CATEGORY_PREFIXES.find(({ prefix }) => notificationType.startsWith(prefix));
  return match?.category ?? 'general';
}

function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** Local clock minutes for `date` in IANA `timeZone` (falls back to UTC). */
export function minutesInTimeZone(date: Date, timeZone?: string | null): number {
  const tz = timeZone?.trim() || 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? NaN);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? NaN);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      return date.getUTCHours() * 60 + date.getUTCMinutes();
    }
    return hour * 60 + minute;
  } catch {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }
}

/** Returns true when `now` falls inside configured quiet hours (same-day or overnight window). */
export function isInQuietHours(
  now: Date,
  start: string | null | undefined,
  end: string | null | undefined,
  timeZone?: string | null,
): boolean {
  if (!start || !end) return false;
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes == null || endMinutes == null) return false;

  const currentMinutes = minutesInTimeZone(now, timeZone);
  if (startMinutes === endMinutes) return false;

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

export interface NotificationPreferenceRecord {
  preferences?: Record<string, unknown> | null;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  quietHoursTimezone?: string | null;
}

export function shouldDeliverNotification(params: {
  notificationType: string;
  priority?: string;
  preference?: NotificationPreferenceRecord | null;
}): boolean {
  const { notificationType, priority, preference } = params;
  if (!preference) return true;

  const prefs = (preference.preferences ?? {}) as Record<string, unknown>;
  const disabledTypes = Array.isArray(prefs.disabledTypes)
    ? prefs.disabledTypes.map((entry) => String(entry))
    : [];
  if (disabledTypes.includes(notificationType)) return false;

  const globalInApp = prefs.inApp;
  if (globalInApp === false) return false;

  const category = resolvePreferenceCategory(notificationType);
  const categoryPref = prefs[category];
  if (categoryPref && typeof categoryPref === 'object' && categoryPref !== null) {
    const inApp = (categoryPref as Record<string, unknown>).inApp;
    if (inApp === false) return false;
  } else if (categoryPref === false) {
    return false;
  }

  if (
    priority !== 'CRITICAL' &&
    isInQuietHours(
      new Date(),
      preference.quietHoursStart,
      preference.quietHoursEnd,
      preference.quietHoursTimezone,
    )
  ) {
    return false;
  }

  return true;
}
