import { createDocumentVerifyToken } from './verify-token.util';

function resolveWebAppOrigin(): string {
  const candidates = [
    process.env.WEB_APP_URL,
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ];
  for (const raw of candidates) {
    const origin = (raw ?? '').trim().replace(/\/$/, '');
    if (!origin) continue;
    try {
      const host = new URL(origin).hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1') continue;
      return origin;
    } catch {
      continue;
    }
  }
  return 'https://app.nestlancer.com';
}

/**
 * Public authenticity check URL printed on PDFs / QR codes.
 * Points at the client portal verify page (not raw API) so the HMAC token
 * is preserved through the UI after E-10 hardening.
 */
export function publicDocumentVerifyUrl(documentNumber: string): string {
  const origin = resolveWebAppOrigin();
  const path = `${origin}/verify-document?number=${encodeURIComponent(documentNumber)}`;
  try {
    const token = createDocumentVerifyToken(documentNumber);
    return `${path}&t=${encodeURIComponent(token)}`;
  } catch {
    // Build/test environments without secrets still emit a number-only URL;
    // the public API rejects tokenless verify in production.
    return path;
  }
}
