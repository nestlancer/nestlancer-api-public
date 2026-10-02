import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** ISO date range for notification segment targeting. */
export class SegmentDateRangeDto {
  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Inclusive start date (ISO 8601 calendar date)',
  })
  @IsOptional()
  @IsString()
  start?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Inclusive end date (ISO 8601 calendar date)',
  })
  @IsOptional()
  @IsString()
  end?: string;
}
