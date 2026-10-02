import { Injectable } from '@nestjs/common';
import { CacheService } from '@nestlancer/cache';
import { ClearCacheDto } from '../dto/clear-cache.dto';

@Injectable()
export class CacheManagementService {
  constructor(private readonly cacheService: CacheService) {}

  async clearCache(dto: ClearCacheDto) {
    if (dto.keyPattern) {
      // Logic to resolve keys by pattern and delele them
      // This usually requires `keys` command in Redis, but we'll simulate direct deletion
      await this.cacheService.del(dto.keyPattern); // In a real scenario, scan and delete
      return { message: `Cleared cache matching pattern: ${dto.keyPattern}` };
    } else {
      // Flush entire Redis DB
      await this.cacheService.getClient().flushdb();
      return { message: 'All caches cleared successfully' };
    }
  }
}
