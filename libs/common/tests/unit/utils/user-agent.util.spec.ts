import { parseUserAgent } from '../../../src/utils/user-agent.util';

describe('parseUserAgent', () => {
  it('labels curl as API client', () => {
    expect(parseUserAgent('curl/8.5.0')).toEqual({
      type: 'desktop',
      browser: 'cURL',
      os: 'API client',
    });
  });

  it('parses Chrome on macOS', () => {
    const result = parseUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    expect(result.browser).toContain('Chrome');
    expect(result.os.toLowerCase()).toContain('mac');
  });

  it('parses minimal seed UA with Chrome token', () => {
    const result = parseUserAgent('Mozilla/5.0 Chrome/120');
    expect(result.browser).toContain('Chrome');
    expect(result.os).toBe('Desktop');
  });

  it('returns unknown device for empty UA', () => {
    expect(parseUserAgent('')).toEqual({
      type: 'desktop',
      browser: 'Unknown device',
      os: 'Unknown platform',
    });
  });
});
