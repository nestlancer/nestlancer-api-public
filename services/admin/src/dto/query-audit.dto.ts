import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '@nestlancer/common';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Filter criteria for retrieving system-wide audit trail logs.
 */
export class QueryAuditDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter logs by the user who performed the action',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter logs by the category of system resource affected',
    example: 'Project',
  })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiPropertyOptional({
    description: 'Filter logs by the specific action executed',
    example: 'USER_LOGIN',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Start date for the audit trail report',
    example: '2023-01-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'End date for the audit trail report',
    example: '2023-12-31',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
