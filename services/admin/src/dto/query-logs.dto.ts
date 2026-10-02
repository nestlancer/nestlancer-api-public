import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard severity levels for system logging.
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Filter criteria for retrieving low-level system diagnostic logs.
 */
export class QueryLogsDto {
  @ApiPropertyOptional({
    description: 'Minimum severity level to retrieve',
    enum: LogLevel,
    example: LogLevel.ERROR,
  })
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @ApiPropertyOptional({
    description: 'Target microservice name to filter logs',
    example: 'auth-service',
  })
  @IsOptional()
  @IsString()
  service?: string;

  @ApiPropertyOptional({
    description: 'Start time for log retrieval',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End time for log retrieval',
    example: '2023-01-01T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
