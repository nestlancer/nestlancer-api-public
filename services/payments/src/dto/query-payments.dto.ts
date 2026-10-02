import { IsOptional, IsString, IsInt, Min, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentStatus } from '@nestlancer/common';

const CLIENT_PAYMENT_STATUS_FILTERS = [
  ...Object.values(PaymentStatus),
  /** Virtual: open schedule rows that are not yet payable (NL-PAY-008). */
  'NOT_DUE',
] as const;

/**
 * Data Transfer Object for querying payments with filtering and pagination.
 */
export class QueryPaymentsDto {
  @ApiPropertyOptional({
    enum: CLIENT_PAYMENT_STATUS_FILTERS,
    description:
      'Filter payments by status. PENDING = due/payable open rows; NOT_DUE = open rows not yet payable.',
  })
  @IsOptional()
  @IsIn(CLIENT_PAYMENT_STATUS_FILTERS)
  status?: PaymentStatus | 'NOT_DUE';

  @ApiPropertyOptional({ description: 'Filter payments by project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter payments by client user ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number for pagination' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  /** Alias accepted by other services (`pageSize`); normalized to `limit` by callers. */
  @ApiPropertyOptional({ example: 20, description: 'Alias for limit (cross-service pagination)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
