export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: Record<string, unknown>;
  error?: string;
  lastChecked: string;
}
export interface AggregatedHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, HealthCheckResult>;
  timestamp: string;
  version: string;
  uptime: number;
}
