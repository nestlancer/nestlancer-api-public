export type HealthStatusValue = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ServiceHealthStatus {
  status: HealthStatusValue;
  responseTime?: number;
  uptime?: string;
  connections?: {
    active: number;
    idle: number;
    total: number;
  };
  hitRate?: number;
  memoryUsage?: string;
  pendingJobs?: number;
  workers?: number;
}

export interface AggregatedHealthStatus {
  status: HealthStatusValue;
  timestamp: string;
  uptime?: string;
  version: string;
  environment?: string;
  services: Record<string, ServiceHealthStatus>;
  checks: Record<string, 'pass' | 'fail'>;
}

export interface DebugHealthStatus {
  status: HealthStatusValue;
  timestamp: string;
  server: {
    hostname: string;
    platform: string;
    architecture: string;
    nodeVersion: string;
    memory: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
    cpu: {
      cores: number;
      model: string;
      loadAverage: number[];
    };
    disk: {
      total: number;
      free: number;
      used: number;
      usagePercent: number;
    };
  };
  process: {
    pid: number;
    uptime: number;
    memory: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
      external: number;
    };
  };
  dependencies: Record<string, any>;
  featureFlags: Record<string, boolean>;
}
