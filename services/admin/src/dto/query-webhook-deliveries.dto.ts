import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '@nestlancer/common';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Valid status types for webhook deliveries.
 */
export enum DeliveryStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

/**
 * Query parameters for filtering webhook delivery logs.
 */
export class QueryWebhookDeliveriesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: DeliveryStatus,
    description: 'Filter deliveries by their execution status',
  })
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;
}
