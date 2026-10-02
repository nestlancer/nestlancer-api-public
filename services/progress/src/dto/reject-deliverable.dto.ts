import { IsString, MaxLength, IsOptional, IsArray, IsNotEmpty, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for rejecting a deliverable submission.
 */
export class RejectDeliverableDto {
  @ApiProperty({
    example: 'The branding colors do not match the style guide.',
    maxLength: 2000,
    description: 'The reason for rejection',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(2000)
  reason: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Update primary color to #FF5733', 'Fix alignment on header'],
    description: 'Specific changes requested',
  })
  @IsOptional()
  @IsArray()
  requestedChanges?: string[];
}
