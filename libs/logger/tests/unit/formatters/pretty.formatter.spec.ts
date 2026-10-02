import { formatPretty } from '../../../src/formatters/pretty.formatter';

describe('PrettyFormatter', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should format log entry with timestamp and level', () => {
    const result = formatPretty({ level: 'info', message: 'Hello World' });
    expect(result).toBe('[2024-01-01T00:00:00.000Z] [INFO] Hello World');
  });

  it('should include context if provided', () => {
    const result = formatPretty({
      level: 'error',
      message: 'Something failed',
      context: 'Database',
    });
    expect(result).toBe('[2024-01-01T00:00:00.000Z] [ERROR] [Database] Something failed');
  });

  it('should handle missing message gracefully (prints undefined)', () => {
    const result = formatPretty({ level: 'warn' });
    expect(result).toBe('[2024-01-01T00:00:00.000Z] [WARN] undefined');
  });
});
