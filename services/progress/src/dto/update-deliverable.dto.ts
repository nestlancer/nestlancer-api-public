import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const DELIVERABLE_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'READY_FOR_REVIEW',
  'REVISION_REQUESTED',
  'APPROVED',
  'REJECTED',
] as const;

/**
 * Data Transfer Object for updating an existing deliverable.
 */
export class UpdateDeliverableDto {
  @ApiPropertyOptional({
    example: 'Revised draft with updated branding...',
    maxLength: 1000,
    description: 'Updated description or notes',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    enum: DELIVERABLE_STATUSES,
    description: 'Moderation status (admin)',
  })
  @IsOptional()
  @IsString()
  @IsIn(DELIVERABLE_STATUSES)
  status?: (typeof DELIVERABLE_STATUSES)[number];

  @ApiPropertyOptional({
    example: 'Does not meet acceptance criteria for milestone 2.',
    maxLength: 1000,
    description: 'Reason when rejecting a deliverable',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;
}
