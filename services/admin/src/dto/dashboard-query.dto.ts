import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Valid time divisions for dashboard data aggregation.
 */
export enum Period {
  TODAY = 'TODAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
}

/**
 * Filter criteria for retrieving system performance and overview metrics.
 */
export class DashboardQueryDto {
  @ApiPropertyOptional({
    description: 'The time range for which dashboard data should be aggregated',
    enum: Period,
    example: Period.MONTH,
  })
  @IsOptional()
  @IsEnum(Period)
  period?: Period;
}
