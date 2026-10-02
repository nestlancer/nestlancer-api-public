const REVISION_OVERFLOW_PREFIX = 'REVISION_OVERFLOW:';

/** Default manual-payment note used to embed an operator UUID (NL-BUG-PAY-NOTES). */
const ADMIN_OPERATOR_NOTE =
  /manual payment by admin\s+[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * Client-visible payment notes. Operator ids stay on `verifiedById`; overflow
 * payloads are an internal protocol and must not reach invoices or PDFs.
 */
export function sanitizeClientPaymentNotes(notes?: string | null): string | null {
  if (!notes?.trim()) return null;
  const trimmed = notes.trim();
  if (trimmed.startsWith(REVISION_OVERFLOW_PREFIX)) return null;
  const cleaned = trimmed.replace(ADMIN_OPERATOR_NOTE, 'Recorded by support').trim();
  return cleaned || null;
}
