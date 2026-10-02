import { SetMetadata } from '@nestjs/common';
export const CACHEABLE_KEY = 'cacheable';
export interface CacheableOptions {
  key?: string;
  ttl?: number;
  tags?: string[];
}
export const Cacheable = (options: CacheableOptions = {}) => SetMetadata(CACHEABLE_KEY, options);
