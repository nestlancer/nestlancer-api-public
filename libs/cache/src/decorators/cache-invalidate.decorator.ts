import { SetMetadata } from '@nestjs/common';
export const CACHE_INVALIDATE_KEY = 'cacheInvalidate';
export const CacheInvalidate = (...tags: string[]) => SetMetadata(CACHE_INVALIDATE_KEY, tags);
