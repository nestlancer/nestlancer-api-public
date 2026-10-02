import { IsString, IsOptional, MaxLength, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for processing a refund.
 */
export class ProcessRefundDto {
  @ApiPropertyOptional({
    example: 500000,
    description:
      'Optional partial refund amount in the same unit as Payment.amount (paise for INR). If omitted, full refund is processed.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  amount?: number; // Optional partial refund amount

  @ApiPropertyOptional({
    example: 'Project cancelled',
    maxLength: 500,
    description:
      'Reason for the refund. Required for offline/manual/bank payments that have no Razorpay external id.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
