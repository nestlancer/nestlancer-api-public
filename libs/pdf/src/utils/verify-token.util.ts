import { createHmac, timingSafeEqual } from 'crypto';

const TOKEN_BYTES = 16;
const TOKEN_PREFIX = 'doc-verify:v1:';

/**
 * Secret for public document-verify HMAC tokens.
 * Prefer DOCUMENT_VERIFY_SECRET; fall back to ENCRYPTION_KEY / JWT_ACCESS_SECRET.
 */
export function resolveDocumentVerifySecret(): string {
  return (
    process.env.DOCUMENT_VERIFY_SECRET?.trim() ||
    process.env.ENCRYPTION_KEY?.trim() ||
    process.env.JWT_ACCESS_SECRET?.trim() ||
    ''
  );
}

/** Deterministic, high-entropy token bound to a document number (no DB column required). */
export function createDocumentVerifyToken(documentNumber: string, secret?: string): string {
  const key = secret ?? resolveDocumentVerifySecret();
  if (!key) {
    throw new Error('DOCUMENT_VERIFY_SECRET (or ENCRYPTION_KEY / JWT_ACCESS_SECRET) is required');
  }
  return createHmac('sha256', key)
    .update(`${TOKEN_PREFIX}${documentNumber.trim()}`)
    .digest('base64url')
    .slice(0, TOKEN_BYTES);
}

export function isValidDocumentVerifyToken(
  documentNumber: string,
  token: string | undefined | null,
  secret?: string,
): boolean {
  if (!token || typeof token !== 'string') return false;
  const provided = token.trim();
  if (provided.length < 12 || provided.length > 64) return false;

  let expected: string;
  try {
    expected = createDocumentVerifyToken(documentNumber, secret);
  } catch {
    return false;
  }

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
