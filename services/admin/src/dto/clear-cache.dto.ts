import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Controller for manual system cache invalidation.
 */
export class ClearCacheDto {
  @ApiPropertyOptional({
    description: 'Glob-style pattern for cache keys to purge (leave empty for full flush)',
    example: 'user_profile_*',
  })
  @IsOptional()
  @IsString()
  keyPattern?: string;
}
