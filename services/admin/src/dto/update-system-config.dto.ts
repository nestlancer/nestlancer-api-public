import { IsDefined, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for modifying global system configuration parameters (upsert by key).
 */
export class UpdateSystemConfigDto {
  @ApiProperty({
    description: 'The unique configuration key to update',
    example: 'MAX_UPLOAD_SIZE',
  })
  @IsString()
  key: string;

  @ApiProperty({
    description: 'JSON configuration value (string, number, boolean, or object)',
    type: 'object',
    additionalProperties: true,
    example: { maxUploadMb: 50 },
  })
  @IsDefined()
  value: unknown;

  @ApiPropertyOptional({ description: 'Optional human-readable description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
