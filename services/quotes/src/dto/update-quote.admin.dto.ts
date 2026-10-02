import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  IsOptional,
  MaxLength,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateQuoteAdminDto } from './create-quote.admin.dto';

type PaymentScheduleDueTrigger = 'on_accept' | 'on_prior_approved' | 'on_date';

/**
 * Payment installment row for quote patch (matches requests CreateQuoteDto schedule shape).
 */
export class UpdateQuotePaymentScheduleInstallmentDto {
  @ApiProperty({ description: 'Installment label shown to client', example: 'Deposit' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({
    description: 'Percentage of quote total (use this OR amount, not both required)',
    example: 30,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @ApiPropertyOptional({
    description: 'Fixed amount in major currency (e.g. rupees). Use when not using percentage.',
    example: 15000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    description: 'When this installment becomes payable',
    enum: ['on_accept', 'on_prior_approved', 'on_date'],
    example: 'on_accept',
  })
  @IsOptional()
  @IsString()
  @IsIn(['on_accept', 'on_prior_approved', 'on_date'])
  dueTrigger?: PaymentScheduleDueTrigger;

  @ApiPropertyOptional({
    description: 'Due date (required when dueTrigger is on_date)',
    example: '2025-03-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  dueDate?: string;
}

/**
 * Line item for updating quotes created from project requests.
 */
export class UpdateQuoteLineItemDto {
  @ApiPropertyOptional({ example: 'Frontend UI implementation' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 1, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ example: 2500, minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

/**
 * Administrative DTO for updating an existing quote.
 */
export class UpdateQuoteAdminDto extends PartialType(CreateQuoteAdminDto) {
  @ApiPropertyOptional({
    description: 'Replace line items (request-style quotes) and recalculate totals',
    type: [UpdateQuoteLineItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuoteLineItemDto)
  items?: UpdateQuoteLineItemDto[];

  @ApiPropertyOptional({
    description: 'Tax percentage applied to subtotal',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercentage?: number;

  @ApiPropertyOptional({
    description:
      'Project-specific terms added on top of the standard Nestlancer terms snapshotted on the quote',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  termsAndConditions?: string;

  @ApiPropertyOptional({
    description: 'Internal notes (admin only)',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;

  @ApiPropertyOptional({
    description: 'Whether the client must sign the service agreement when accepting the quote',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  requiresContract?: boolean;

  @ApiPropertyOptional({
    description: 'Built-in payment schedule preset (rebuilds paymentSchedule from quote total)',
    example: '30-70',
  })
  @IsOptional()
  @IsString()
  schedulePreset?: string;

  @ApiPropertyOptional({
    description: 'Custom payment schedule rows (amounts in major currency or percentages)',
    type: [UpdateQuotePaymentScheduleInstallmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuotePaymentScheduleInstallmentDto)
  paymentSchedule?: UpdateQuotePaymentScheduleInstallmentDto[];
}
