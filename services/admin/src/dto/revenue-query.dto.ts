import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { Period } from './dashboard-query.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Filter criteria for financial and revenue data reporting.
 */
export class RevenueQueryDto {
  @ApiPropertyOptional({
    description: 'Predefined timeframe for revenue aggregation',
    enum: Period,
    example: Period.QUARTER,
  })
  @IsOptional()
  @IsEnum(Period)
  period?: Period;

  @ApiPropertyOptional({
    description: 'Custom start date for the revenue report',
    example: '2023-01-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Custom end date for the revenue report',
    example: '2023-03-31',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
