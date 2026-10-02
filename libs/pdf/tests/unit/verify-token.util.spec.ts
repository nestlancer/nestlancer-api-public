import {
  createDocumentVerifyToken,
  isValidDocumentVerifyToken,
} from '../../src/utils/verify-token.util';
import { publicDocumentVerifyUrl } from '../../src/utils/verify-url.util';

describe('document verify token', () => {
  const secret = 'test-document-verify-secret';

  beforeEach(() => {
    process.env.DOCUMENT_VERIFY_SECRET = secret;
  });

  afterEach(() => {
    delete process.env.DOCUMENT_VERIFY_SECRET;
    delete process.env.API_PUBLIC_URL;
    delete process.env.FRONTEND_URL;
    delete process.env.WEB_APP_URL;
  });

  it('creates a stable token for a document number', () => {
    const a = createDocumentVerifyToken('NL-INV-2026-000001', secret);
    const b = createDocumentVerifyToken('NL-INV-2026-000001', secret);
    expect(a).toBe(b);
    expect(a.length).toBe(16);
  });

  it('rejects missing or wrong tokens', () => {
    const doc = 'NL-INV-2026-000001';
    const good = createDocumentVerifyToken(doc, secret);
    expect(isValidDocumentVerifyToken(doc, good, secret)).toBe(true);
    expect(isValidDocumentVerifyToken(doc, undefined, secret)).toBe(false);
    expect(isValidDocumentVerifyToken(doc, 'not-a-real-token!!', secret)).toBe(false);
    expect(isValidDocumentVerifyToken(doc, createDocumentVerifyToken('NL-INV-2026-000002', secret), secret)).toBe(
      false,
    );
  });

  it('embeds token in public verify URL on the web app', () => {
    process.env.FRONTEND_URL = 'https://app.nestlancer.com';
    const url = publicDocumentVerifyUrl('NL-INV-2026-000001');
    const token = createDocumentVerifyToken('NL-INV-2026-000001', secret);
    expect(url).toBe(
      `https://app.nestlancer.com/verify-document?number=NL-INV-2026-000001&t=${encodeURIComponent(token)}`,
    );
  });
});
