/**
 * Canonical document numbers use Nestlancer prefixes: NL-INV, NL-RCPT, NL-QTE, …
 * Legacy seeds / older UIs printed transposed forms such as INV-NL-YYYY-N.
 * Verify and PDF paths must accept both so the number on the page matches the registry.
 */

const LEGACY_TRANSPOSE: Record<string, string> = {
  'INV-NL': 'NL-INV',
  'RCPT-NL': 'NL-RCPT',
  'QTE-NL': 'NL-QTE',
  'CTR-NL': 'NL-CTR',
  'REM-NL': 'NL-REM',
};

const CANONICAL_TO_LEGACY: Record<string, string> = Object.fromEntries(
  Object.entries(LEGACY_TRANSPOSE).map(([legacy, canonical]) => [canonical, legacy]),
);

/** Pad a numeric sequence segment to 6 digits when present. */
function padSequence(parts: string[]): string[] {
  if (parts.length < 1) return parts;
  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last) && last.length < 6) {
    return [...parts.slice(0, -1), last.padStart(6, '0')];
  }
  return parts;
}

/**
 * Returns candidate document numbers to look up (original + aliases), de-duplicated.
 * Order: exact input first, then canonical swap, then padded variants.
 */
export function expandDocumentNumberCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const upper = trimmed.toUpperCase();
  const candidates: string[] = [trimmed];
  if (upper !== trimmed) candidates.push(upper);

  for (const [legacy, canonical] of Object.entries(LEGACY_TRANSPOSE)) {
    if (upper.startsWith(`${legacy}-`)) {
      const rest = upper.slice(legacy.length + 1);
      const swapped = `${canonical}-${rest}`;
      candidates.push(swapped);
      const paddedParts = padSequence(swapped.split('-'));
      candidates.push(paddedParts.join('-'));
      // Also try unpadded→padded on the legacy form itself
      const legacyPadded = padSequence(upper.split('-')).join('-');
      candidates.push(legacyPadded);
    }
  }

  for (const [canonical, legacy] of Object.entries(CANONICAL_TO_LEGACY)) {
    if (upper.startsWith(`${canonical}-`)) {
      const rest = upper.slice(canonical.length + 1);
      candidates.push(`${legacy}-${rest}`);
      // Short legacy sequences without leading zeros (INV-NL-2026-0002 ↔ NL-INV-2026-000002)
      const restParts = rest.split('-');
      if (restParts.length >= 2) {
        const year = restParts[0];
        const seq = restParts.slice(1).join('-');
        if (/^\d+$/.test(seq)) {
          const unpadded = String(parseInt(seq, 10));
          candidates.push(`${legacy}-${year}-${unpadded}`);
          candidates.push(`${canonical}-${year}-${unpadded.padStart(6, '0')}`);
          candidates.push(`${canonical}-${year}-${unpadded}`);
        }
      }
    }
  }

  // Generic pad for NL-* forms already canonical
  if (/^NL-[A-Z]+-\d{4}-\d+$/i.test(upper)) {
    candidates.push(padSequence(upper.split('-')).join('-'));
  }

  return [...new Set(candidates.filter(Boolean))];
}

/** True when a payment/template invoice number looks like a legacy non-canonical form. */
export function isLegacyDocumentNumber(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  const upper = value.trim().toUpperCase();
  return Object.keys(LEGACY_TRANSPOSE).some((legacy) => upper.startsWith(`${legacy}-`));
}
