import {
  isRateLimitEnabled,
  parseEnvNonNegativeInt,
  parseEnvPositiveInt,
  parseEnvString,
} from '../../../src/utils/rate-limit-env.util';

describe('rate-limit-env.util', () => {
  describe('parseEnvString', () => {
    it('strips Infisical single and double quotes', () => {
      expect(parseEnvString("'false'")).toBe('false');
      expect(parseEnvString('"false"')).toBe('false');
      expect(parseEnvString("  '10000'  ")).toBe('10000');
    });
  });

  describe('isRateLimitEnabled', () => {
    it('treats false/0/off/no (quoted or not) as disabled', () => {
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: 'false' })).toBe(false);
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: "'false'" })).toBe(false);
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: '"false"' })).toBe(false);
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: '0' })).toBe(false);
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: "'0'" })).toBe(false);
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: 'off' })).toBe(false);
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: 'NO' })).toBe(false);
    });

    it('treats true/1/on/yes as enabled', () => {
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: 'true' })).toBe(true);
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: "'true'" })).toBe(true);
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: '1' })).toBe(true);
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: 'on' })).toBe(true);
    });

    it('defaults to enabled when unset', () => {
      expect(isRateLimitEnabled({})).toBe(true);
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: '' })).toBe(true);
      expect(isRateLimitEnabled({ RATE_LIMIT_ENABLED: 'maybe' })).toBe(true);
    });
  });

  describe('parseEnvPositiveInt', () => {
    it('parses quoted Infisical sentinels', () => {
      expect(parseEnvPositiveInt("'10000'", 5)).toBe(10000);
      expect(parseEnvPositiveInt('"10000"', 5)).toBe(10000);
      expect(parseEnvPositiveInt('10000', 5)).toBe(10000);
    });

    it('falls back on invalid values', () => {
      expect(parseEnvPositiveInt("'abc'", 5)).toBe(5);
      expect(parseEnvPositiveInt('0', 5)).toBe(5);
      expect(parseEnvPositiveInt(undefined, 5)).toBe(5);
    });
  });

  describe('parseEnvNonNegativeInt', () => {
    it('allows zero', () => {
      expect(parseEnvNonNegativeInt('0', 60)).toBe(0);
      expect(parseEnvNonNegativeInt("'0'", 60)).toBe(0);
    });
  });
});
