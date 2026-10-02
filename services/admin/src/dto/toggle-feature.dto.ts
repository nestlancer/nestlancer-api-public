import { IsBoolean, IsOptional, IsInt, IsString, Max, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Upsert / toggle a feature flag. `enabled` is required; description and rollout are optional.
 */
export class ToggleFeatureDto {
  @ApiProperty({ description: 'Target state for the feature flag', example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: 'Human-readable description of the flag' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Rollout percentage 0–100', example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;
}
