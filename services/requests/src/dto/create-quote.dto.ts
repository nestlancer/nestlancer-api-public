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
  ValidateIf,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { PaymentScheduleDueTrigger, PaymentSchedulePresetId } from '@nestlancer/common';

/**
 * Individual line item within a project quote.
 */
class QuoteItemDto {
  @ApiProperty({
    description: 'Detailed description of the service or component',
    example: 'Frontend UI Implementation - Dashboard',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Quantity or hours for the item', example: 1, minimum: 0 })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({
    description: 'Price per unit in major currency (e.g. ₹2,500.00). Stored as paise server-side.',
    example: 2500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

/**
 * Admin-defined payment installment (when client pays — separate from billing line items).
 */
class PaymentScheduleInstallmentDto {
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

const SCHEDULE_PRESET_IDS = ['50-50', '30-70', '30-40-30', '25-25-25-25', '100-upfront'] as const;

/**
 * DTO for generating a formal quote based on a client request.
 */
export class CreateQuoteDto {
  @ApiPropertyOptional({
    description:
      'When true and request has servicePackageId, prefill items from package deliverables if items is empty.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  prefillFromPackage?: boolean;

  @ApiPropertyOptional({
    description: 'Include optional add-ons from service package when prefillFromPackage is true',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  includePackageAddOns?: boolean;

  @ApiProperty({
    description: 'List of line items comprising the quote total (billing breakdown)',
    type: [QuoteItemDto],
  })
  @ValidateIf((o) => !o.prefillFromPackage)
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items?: QuoteItemDto[];

  @ApiPropertyOptional({
    description:
      'Built-in payment schedule preset. Used when paymentSchedule is omitted. Defaults to 50-50.',
    enum: SCHEDULE_PRESET_IDS,
    example: '30-70',
  })
  @IsOptional()
  @IsString()
  @IsIn([...SCHEDULE_PRESET_IDS])
  schedulePreset?: PaymentSchedulePresetId;

  @ApiPropertyOptional({
    description:
      'Custom payment installments (amounts in major currency or percentages). Overrides schedulePreset.',
    type: [PaymentScheduleInstallmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentScheduleInstallmentDto)
  paymentSchedule?: PaymentScheduleInstallmentDto[];

  @ApiProperty({ description: 'ISO currency code for the quote', example: 'INR', maxLength: 3 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  currency: string;

  @ApiProperty({ description: 'Tax percentage to apply to the subtotal', example: 10, minimum: 0 })
  @IsNumber()
  @Min(0)
  taxPercentage: number;

  @ApiProperty({ description: 'Quote expiration date', example: '2024-12-31T23:59:59Z' })
  @IsString()
  @IsNotEmpty()
  validUntil: string; // ISO date string

  @ApiPropertyOptional({
    description:
      'Project-specific terms added on top of the platform standard terms (payment milestones, scope boundaries, client responsibilities, etc.)',
    example:
      '30% deposit on acceptance. Client provides brand assets within 5 business days of kickoff.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  termsAndConditions?: string;

  @ApiPropertyOptional({
    description: 'Internal administrative or project management notes',
    example: 'Priority client. Standard rates applied.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;

  @ApiPropertyOptional({
    description: 'Whether client must sign contract before deposit (enterprise clients)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresContract?: boolean;

  @ApiPropertyOptional({
    description: 'Number of revision rounds included in this quote',
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  revisionsIncluded?: number;

  @ApiPropertyOptional({
    description:
      'Overflow fee per additional revision in major currency (paise stored server-side)',
    example: 5000,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalRevisionCost?: number;

  @ApiPropertyOptional({
    description:
      'When true, apply the client tier discount (e.g. VIP 10%) to computed list-price totals. Default false — never silently rewrite admin totals (NL-BUG-PAY-001).',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  applyClientTierDiscount?: boolean;
}
