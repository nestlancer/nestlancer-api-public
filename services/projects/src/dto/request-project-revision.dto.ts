import { IsString, IsNotEmpty, IsArray, IsOptional, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Priority levels for revision requests.
 */
export enum RevisionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * DTO for requesting a revision on a project.
 */
export class RequestProjectRevisionDto {
  @ApiProperty({
    description: 'The functional or design area needing revision',
    example: 'User Authentication',
  })
  @IsString()
  @IsNotEmpty()
  area: string;

  @ApiProperty({
    description: 'Urgency of the revision request',
    enum: RevisionPriority,
    example: RevisionPriority.MEDIUM,
  })
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority: string;

  @ApiProperty({
    description: 'High-level summary of why the revision is needed',
    example: 'Social login is failing on mobile devices.',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiProperty({
    description: 'Detailed list of specific changes or fixes required',
    example: ['Fix Google Login redirect', 'Update callback URL in console'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  details: string[];

  @ApiPropertyOptional({
    description: 'Array of media/file UUIDs related to the revision request (e.g., screenshots)',
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({
    description: 'Desired completion date for the requested revisions',
    example: '2024-12-31T23:59:59Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsString()
  dueDate?: string; // ISO date
}
