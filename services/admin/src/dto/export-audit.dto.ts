import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Supported file formats for audit trail data exports.
 */
export enum ExportFormat {
  CSV = 'CSV',
  JSON = 'JSON',
}

/**
 * Filter and format configuration for generating system audit trail reports.
 */
export class ExportAuditDto {
  @ApiProperty({
    description: 'The target file format for the exported data',
    enum: ExportFormat,
    example: ExportFormat.CSV,
  })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiPropertyOptional({
    description: 'Filter logs by actor user UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter logs by resource category', example: 'Security' })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({
    description: 'Filter logs by specific system action',
    example: 'ACCOUNT_SUSPENDED',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Reporting range start date', example: '2023-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Reporting range end date', example: '2023-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
