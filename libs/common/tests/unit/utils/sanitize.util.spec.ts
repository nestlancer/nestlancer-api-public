import { escapeHtml, maskSensitiveFields, sanitizeUserContent } from '../../../src/utils/sanitize.util';

describe('SanitizeUtils', () => {
  describe('escapeHtml', () => {
    it('escapes angle brackets and quotes', () => {
      expect(escapeHtml('<script>alert("x")</script>')).toBe(
        '&lt;script&gt;alert(&quot;x&quot;)&lt;&#x2F;script&gt;',
      );
    });
  });

  describe('sanitizeUserContent', () => {
    it('strips script tags and html while keeping plain text', () => {
      expect(sanitizeUserContent('<script>alert(1)</script>AUDIT-XSS')).toBe('AUDIT-XSS');
      expect(sanitizeUserContent('Hello <b>world</b>')).toBe('Hello world');
    });

    it('strips javascript: and inline handlers', () => {
      expect(sanitizeUserContent('click javascript:alert(1) onload=x')).toBe(
        'click alert(1) x',
      );
    });
  });

  describe('maskSensitiveFields', () => {
    it('should mask sensitive fields', () => {
      const input = {
        username: 'john',
        password: 'secret_password',
        token: 'secret_token',
      };
      const result = maskSensitiveFields(input);
      expect(result.username).toBe('john');
      expect(result.password).toBe('***REDACTED***');
      expect(result.token).toBe('***REDACTED***');
    });

    it('should handle nested objects', () => {
      const input = {
        user: {
          username: 'john',
          credentials: {
            password: 'pwd',
          },
        },
      };
      const result = maskSensitiveFields(input) as any;
      expect(result.user.username).toBe('john');
      expect(result.user.credentials.password).toBe('***REDACTED***');
    });

    it('should handle custom fields', () => {
      const input = {
        apiKey: '12345',
      };
      const result = maskSensitiveFields(input, ['apiKey']);
      expect(result.apiKey).toBe('***REDACTED***');
    });
  });
});
