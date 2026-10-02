import { registerAs } from '@nestjs/config';

export default registerAs('healthService', () => ({
  version: process.env.npm_package_version || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  cacheTtl: parseInt(process.env.HEALTH_CACHE_TTL || '30000', 10), // 30s cache for complex checks
  timeouts: {
    database: parseInt(process.env.HEALTH_TIMEOUT_DB || '2000', 10),
    cache: parseInt(process.env.HEALTH_TIMEOUT_CACHE || '1000', 10),
    queue: parseInt(process.env.HEALTH_TIMEOUT_QUEUE || '2000', 10),
    storage: parseInt(process.env.HEALTH_TIMEOUT_STORAGE || '3000', 10),
    external: parseInt(process.env.HEALTH_TIMEOUT_EXTERNAL || '5000', 10),
  },
  thresholds: {
    memoryHeapUsed: parseInt(process.env.HEALTH_THRESHOLD_MEMORY_HEAP || '268435456', 10), // 256MB
    memoryRss: parseInt(process.env.HEALTH_THRESHOLD_MEMORY_RSS || '536870912', 10), // 512MB
    diskPercent: parseFloat(process.env.HEALTH_THRESHOLD_DISK_PERCENT || '0.9'),
  },
  registryUrl: process.env.SERVICE_REGISTRY_URL || 'http://gateway-service:3000/api/v1/registry',
}));
