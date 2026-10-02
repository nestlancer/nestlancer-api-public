import {
  toISO,
  now,
  addMinutes,
  addHours,
  addDays,
  isExpired,
  diffInSeconds,
} from '../../../src/utils/date.util';

describe('DateUtils', () => {
  describe('toISO', () => {
    it('should convert Date to ISO string', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      expect(toISO(date)).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('now', () => {
    it('should return a Date instance', () => {
      expect(now()).toBeInstanceOf(Date);
    });
  });

  describe('addMinutes', () => {
    it('should add minutes correctly', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const result = addMinutes(start, 30);
      expect(result.toISOString()).toBe('2024-01-01T00:30:00.000Z');
    });
  });

  describe('addHours', () => {
    it('should add hours correctly', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const result = addHours(start, 2);
      expect(result.toISOString()).toBe('2024-01-01T02:00:00.000Z');
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const result = addDays(start, 1);
      expect(result.toISOString()).toBe('2024-01-02T00:00:00.000Z');
    });
  });

  describe('isExpired', () => {
    it('should return true for past dates', () => {
      const past = new Date(Date.now() - 1000);
      expect(isExpired(past)).toBe(true);
    });

    it('should return false for future dates', () => {
      const future = new Date(Date.now() + 10000);
      expect(isExpired(future)).toBe(false);
    });
  });

  describe('diffInSeconds', () => {
    it('should return difference in seconds', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-01T00:01:30Z');
      expect(diffInSeconds(start, end)).toBe(90);
    });
  });
});
