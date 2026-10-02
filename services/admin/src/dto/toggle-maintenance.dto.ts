import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for controlling the global system maintenance mode status.
 */
export class ToggleMaintenanceDto {
  @ApiProperty({ description: 'Enable or disable maintenance mode', example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({
    description: 'Custom message displayed to users during maintenance',
    example: 'Upgrading database. Back in 10 minutes.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 or datetime-local timestamp for expected system availability',
    example: '2023-01-01T02:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  estimatedEnd?: string;
}
