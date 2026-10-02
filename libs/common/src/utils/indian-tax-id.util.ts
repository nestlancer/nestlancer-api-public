import { REGEX } from '../constants/regex.constants';

/** Normalize and validate an Indian GSTIN (NL-BUG-PDF-013). */
export function isValidGstin(value: string | null | undefined): boolean {
  if (value == null) return false;
  const normalized = String(value).trim().toUpperCase();
  return REGEX.GSTIN.test(normalized);
}

/** Normalize and validate an Indian PAN (NL-BUG-PDF-013). */
export function isValidPan(value: string | null | undefined): boolean {
  if (value == null) return false;
  const normalized = String(value).trim().toUpperCase();
  return REGEX.PAN.test(normalized);
}

/**
 * Return uppercase GSTIN when valid, otherwise null.
 * Used at write time and as a PDF render guard so invalid stored values never print.
 */
export function normalizeGstinOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) return null;
  return isValidGstin(normalized) ? normalized : null;
}

export function normalizePanOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) return null;
  return isValidPan(normalized) ? normalized : null;
}
