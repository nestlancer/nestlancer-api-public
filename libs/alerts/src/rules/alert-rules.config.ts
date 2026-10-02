export const ALERT_RULES = [
  { name: 'circuit_breaker_open', severity: 'critical', channels: ['pagerduty', 'slack'] },
  { name: 'high_error_rate', severity: 'warning', channels: ['slack'] },
  { name: 'queue_depth_high', severity: 'warning', channels: ['slack'] },
  { name: 'service_down', severity: 'critical', channels: ['pagerduty', 'slack', 'email'] },
] as const;
