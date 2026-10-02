import { IsUUID, IsArray, IsOptional, IsString, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for uploading a new deliverable submission.
 */
export class UploadDeliverableDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174111',
    description: 'Target milestone ID',
  })
  @IsUUID()
  milestoneId: string;

  @ApiProperty({
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174555'],
    description: 'List of media UUIDs for the deliverable',
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  mediaIds: string[];

  @ApiPropertyOptional({
    example: 'Logo suite',
    maxLength: 200,
    description: 'Client-facing deliverable name (defaults to milestone name or description)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    example: 'Initial draft for review',
    maxLength: 1000,
    description: 'Optional description or notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
