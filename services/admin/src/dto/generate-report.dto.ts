import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateReportDto {
  @ApiPropertyOptional({
    description: 'Report type',
    example: 'REVENUE_REPORT',
    enum: ['REVENUE_REPORT', 'PROJECT_STATS', 'USER_STATS', 'ENGAGEMENT_METRICS', 'OVERVIEW'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['REVENUE_REPORT', 'PROJECT_STATS', 'USER_STATS', 'ENGAGEMENT_METRICS', 'OVERVIEW'])
  type?: string;

  @ApiPropertyOptional({
    description: 'Reporting period',
    example: 'WEEKLY',
    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
  period?: string;

  @ApiPropertyOptional({
    description: 'Export format',
    example: 'PDF',
    enum: ['PDF', 'CSV'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['PDF', 'CSV'])
  format?: string;
}
