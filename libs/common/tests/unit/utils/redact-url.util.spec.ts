import { redactUrlForLogging } from '../../../src/utils/redact-url.util';

describe('redactUrlForLogging', () => {
  it('redacts sensitive query parameters', () => {
    const raw = '/api/v1/share/abc?password=secret&page=2&token=xyz';
    expect(redactUrlForLogging(raw)).toBe(
      '/api/v1/share/abc?password=***REDACTED***&page=2&token=***REDACTED***',
    );
  });

  it('redacts additional sensitive keys', () => {
    const raw = '/oauth/callback?code=abc&sig=deadbeef&session=s1';
    expect(redactUrlForLogging(raw)).toBe(
      '/oauth/callback?code=***REDACTED***&sig=***REDACTED***&session=***REDACTED***',
    );
  });

  it('returns path-only URLs unchanged', () => {
    expect(redactUrlForLogging('/api/v1/auth/login')).toBe('/api/v1/auth/login');
  });
});
