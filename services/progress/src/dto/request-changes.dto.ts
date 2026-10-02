import { IsString, MaxLength, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Detailed requirement for a change request.
 */
export class ChangeRequestDetailDto {
  @ApiProperty({
    example: 'Add social login options',
    maxLength: 500,
    description: 'Description of the specific change',
  })
  @IsString()
  @MaxLength(500)
  description: string;
}

/**
 * Data Transfer Object for requesting changes on a deliverable or milestone.
 */
export class RequestChangesDto {
  @ApiProperty({
    example: 'Scope adjustment based on latest feedback',
    maxLength: 2000,
    description: 'Overall reason for the change request',
  })
  @IsString()
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional({
    type: [ChangeRequestDetailDto],
    description: 'List of specific granular changes required (optional; omit to avoid duplicating reason)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeRequestDetailDto)
  details?: ChangeRequestDetailDto[];
}
