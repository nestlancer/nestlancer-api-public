import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for requesting a revision of milestone timelines or deliverables.
 */
export class RequestMilestoneRevisionDto {
  @ApiProperty({
    example: 'Need more time for the research phase due to data access issues',
    maxLength: 2000,
    description: 'Reason for requesting a revision',
  })
  @IsString()
  @MaxLength(2000)
  reason: string;
}
