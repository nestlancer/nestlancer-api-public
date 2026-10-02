export interface CacheModuleOptions {
  redisUrl?: string;
  defaultTtl?: number;
  maxMemory?: string;
  keyPrefix?: string;
}
