/** Canonical visibility values for progress entries. */
export const PROGRESS_VISIBILITY = {
  CLIENT: 'CLIENT_VISIBLE',
  INTERNAL: 'INTERNAL',
} as const;

/** Legacy and canonical DB values that mean "visible to client". */
export const CLIENT_VISIBLE_PROGRESS_VALUES = ['client', 'CLIENT_VISIBLE'] as const;

export function clientVisibleProgressFilter() {
  return { visibility: { in: [...CLIENT_VISIBLE_PROGRESS_VALUES] } };
}

export function normalizeProgressVisibility(value?: string | null): string {
  const v = String(value ?? '').trim();
  if (!v || v.toLowerCase() === 'client' || v === PROGRESS_VISIBILITY.CLIENT) {
    return PROGRESS_VISIBILITY.CLIENT;
  }
  if (v === PROGRESS_VISIBILITY.INTERNAL || v.toLowerCase() === 'internal') {
    return PROGRESS_VISIBILITY.INTERNAL;
  }
  return PROGRESS_VISIBILITY.CLIENT;
}

export function isClientVisibleProgress(value?: string | null): boolean {
  return normalizeProgressVisibility(value) === PROGRESS_VISIBILITY.CLIENT;
}
