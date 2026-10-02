import { IsOptional, IsInt, Min, Max, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for approving a deliverable submission with optional rating and feedback.
 */
export class ApproveDeliverableDto {
  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'Optional rating for the work provided',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    example: 'The deliverable meets all requirements.',
    maxLength: 1000,
    description: 'Optional feedback for the studio',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;
}
