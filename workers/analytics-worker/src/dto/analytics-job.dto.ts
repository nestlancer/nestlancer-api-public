import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsDate } from 'class-validator';

import { AnalyticsJobType, Period, ExportFormat } from '../interfaces/analytics-job.interface';

export class AnalyticsJobDto {
  @IsEnum(AnalyticsJobType)
  type: AnalyticsJobType;

  @IsEnum(Period)
  period: Period;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  from?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  to?: Date;

  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat;
}
