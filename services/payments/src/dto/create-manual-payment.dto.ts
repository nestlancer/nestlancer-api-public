import {
  Allow,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsInt,
  IsPositive,
  IsUUID,
  IsDateString,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { MAX_PAYMENT_AMOUNT_PAISE } from '@nestlancer/common';

/**
 * Admin manual (offline) payment recording.
 * Amounts are in paise (smallest currency unit).
 *
 * NL-BUG-PAY-001: amount may be omitted only when the milestone schedule amount is > 0;
 * the controller rejects any resolved amount that is not a positive integer.
 */
export class CreateManualPaymentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Project UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Milestone UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  milestoneId: string;

  @ApiPropertyOptional({
    example: 3000000,
    description:
      'Amount in paise (>= 1). When omitted, the billable milestone schedule amount is used. Never omit for zero-amount / delivery-only milestones.',
  })
  @IsOptional()
  @IsNumber()
  @IsInt()
  @IsPositive()
  @Max(MAX_PAYMENT_AMOUNT_PAISE)
  amount?: number;

  @ApiPropertyOptional({
    example: 'INR',
    default: 'INR',
    description: 'Currency code (ISO 4217)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'INR';

  @ApiPropertyOptional({
    description: 'Optional client id — must match the project owner when provided',
  })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Admin notes / UTR reference' })
  @Transform(({ value, obj }) => value ?? obj.reference)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /** Alias for `notes` (UTR / bank reference) accepted by older clients. */
  @ApiPropertyOptional({
    description: 'Deprecated alias for `notes`',
    deprecated: true,
  })
  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reference?: string;

  /**
   * Accepted for forward-compat; offline recording always stores method=`manual`.
   * Extra values are ignored rather than rejected by forbidNonWhitelisted.
   */
  @ApiPropertyOptional({
    description: 'Ignored — manual payments always use method=manual',
    example: 'manual',
  })
  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  method?: string;

  @ApiPropertyOptional({
    description: 'Optional paid-at timestamp (ISO 8601). Defaults to now.',
    example: '2026-09-19T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ description: 'Optional invoice number override' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  invoiceNumber?: string;
}
