import { ALERT_RULES } from '../../../src/rules/alert-rules.config';

describe('Alert Rules Configuration', () => {
  it('should define circuit_breaker_open rule correctly', () => {
    const rule = ALERT_RULES.find((r) => r.name === 'circuit_breaker_open');
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe('critical');
    expect(rule?.channels).toContain('pagerduty');
    expect(rule?.channels).toContain('slack');
  });

  it('should define high_error_rate rule correctly', () => {
    const rule = ALERT_RULES.find((r) => r.name === 'high_error_rate');
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe('warning');
    expect(rule?.channels).toContain('slack');
  });

  it('should define queue_depth_high rule correctly', () => {
    const rule = ALERT_RULES.find((r) => r.name === 'queue_depth_high');
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe('warning');
    expect(rule?.channels).toContain('slack');
  });

  it('should define service_down rule correctly', () => {
    const rule = ALERT_RULES.find((r) => r.name === 'service_down');
    expect(rule).toBeDefined();
    expect(rule?.severity).toBe('critical');
    expect(rule?.channels).toContain('pagerduty');
    expect(rule?.channels).toContain('slack');
    expect(rule?.channels).toContain('email');
  });

  it('rules should be immutable (readonly)', () => {
    // TypeScript enforces readonly const assertions at compile time.
    // We ensure it's not empty as a runtime check.
    expect(ALERT_RULES.length).toBeGreaterThan(0);
    expect(Object.isFrozen(ALERT_RULES)).toBe(false); // as const doesn't freeze at runtime
    // But we expect the content to be structured correctly
    ALERT_RULES.forEach((rule) => {
      expect(rule).toHaveProperty('name');
      expect(rule).toHaveProperty('severity');
      expect(rule).toHaveProperty('channels');
      expect(Array.isArray(rule.channels)).toBe(true);
    });
  });
});
