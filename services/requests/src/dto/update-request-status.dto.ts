import { IsString, IsIn, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Valid lifecycle states for a project request.
 */
export enum RequestStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'underReview',
  QUOTED = 'quoted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CONVERTED = 'convertedToProject',
  CHANGES_REQUESTED = 'changesRequested',
}

/**
 * Administrative DTO for transitioning request states.
 */
export class UpdateRequestStatusDto {
  @ApiProperty({
    description:
      'The new target status: draft (editable), submitted (awaiting review), underReview, quoted, accepted, rejected, convertedToProject, changesRequested',
    enum: RequestStatus,
    example: RequestStatus.UNDER_REVIEW,
  })
  @IsString()
  @IsIn([
    'draft',
    'submitted',
    'underReview',
    'quoted',
    'accepted',
    'rejected',
    'convertedToProject',
    'changesRequested',
  ])
  status: string;

  @ApiPropertyOptional({
    description: 'Administrative reason or context for the status transition',
    example: 'Moving to review after client confirmation of budget.',
    minLength: 5,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  notes?: string;
}
