import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsOptional,
  MaxLength,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payment type categories for quote breakdowns.
 */
export enum QuotePaymentType {
  ADVANCE = 'advance',
  MILESTONE = 'milestone',
  FINAL = 'final',
  SUBSCRIPTION = 'subscription',
  FULL_PAYMENT = 'fullPayment',
}

/**
 * Detailed line item for the payment schedule of a quote.
 */
class QuotePaymentBreakdownDto {
  @ApiPropertyOptional({
    description: 'The nature of this payment installment',
    enum: QuotePaymentType,
    example: QuotePaymentType.MILESTONE,
  })
  @IsOptional()
  @IsString()
  @IsIn(['advance', 'milestone', 'final', 'subscription', 'fullPayment'])
  type?: string;

  @ApiProperty({
    description: 'Specific description of what this payment covers',
    example: 'Completion of frontend UI design phase.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Installment amount in paise (smallest currency unit). Same unit as stored quote totals.',
    example: 250000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'The percentage of the total project value this installment represents',
    example: 25,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({
    description: 'Expected or deadline date for this payment',
    example: '2024-12-01T00:00:00Z',
  })
  @IsString()
  dueDate: string; // ISO Date

  @ApiPropertyOptional({
    description: 'List of deliverable titles linked to this payment module',
    example: ['Figma Design Files', 'Icon Set Assets'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];
}

/**
 * Administrative DTO for generating official project quotes.
 */
export class CreateQuoteAdminDto {
  @ApiProperty({
    description: 'Reference to the project request UUID this quote answers',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @ApiProperty({
    description: 'Descriptive title for the quote proposal',
    example: 'E-commerce Platform Phase 1 Development',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Extensive textual scope and value proposition description',
    example: 'This quote covers the end-to-end development of the MVP...',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiProperty({
    description: 'Total quote amount in paise (smallest currency unit). Same unit as stored/returned totals.',
    example: 1000000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({
    description: 'ISO currency code for the quote',
    example: 'INR',
    maxLength: 3,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(3)
  currency: string;

  @ApiProperty({
    description: 'Absolute expiration date of the quote validity',
    example: '2025-01-15T23:59:59Z',
  })
  @IsString()
  @IsNotEmpty()
  validUntil: string; // ISO date

  @ApiPropertyOptional({
    description: 'Duration in days the quote remains valid from issuance',
    example: 30,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  validityDays?: number;

  @ApiProperty({
    description: 'Phased payment schedule and milestones',
    type: [QuotePaymentBreakdownDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotePaymentBreakdownDto)
  paymentBreakdown: QuotePaymentBreakdownDto[];

  @ApiPropertyOptional({ description: 'Structured timeline information (JSON Object)' })
  @IsOptional()
  timeline?: any;

  @ApiPropertyOptional({ description: 'Detailed project scope definitions (JSON Object)' })
  @IsOptional()
  scope?: any;

  @ApiPropertyOptional({
    description: 'Specific technical requirements or stack details (JSON Object)',
  })
  @IsOptional()
  technicalDetails?: any;

  @ApiPropertyOptional({
    description: 'Specific terms and conditions governing this quote',
    example: '30% upfront requirement. 3 revision cycles included.',
  })
  @IsOptional()
  @IsString()
  terms?: string;

  @ApiPropertyOptional({
    description: 'Internal or client-facing miscellaneous notes',
    example: 'Special discount applied for long-term partnership.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Array of media/file UUIDs for documentation or assets linked to the quote',
    example: ['550e8400-e29b-41d4-a716-446655440001'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
