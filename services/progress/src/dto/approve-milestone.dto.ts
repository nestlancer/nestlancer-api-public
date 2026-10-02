import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for approving a project milestone.
 */
export class ApproveMilestoneDto {
  @ApiPropertyOptional({
    example: 'Excellent work on the initial phase. Proceed to the next milestone.',
    maxLength: 1000,
    description: 'Optional feedback for the studio',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}
