import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Data Transfer Object for querying health status with additional options.
 */
export class HealthQueryDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Force a fresh health check bypassing the cache',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  refresh?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Include verbose diagnostic details in the response',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  verbose?: boolean;
}
