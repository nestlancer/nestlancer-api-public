import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  Min,
  Max,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a payment intent.
 * Used to initiate a transaction for a project or milestone.
 */
export class CreatePaymentIntentDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'The unique ID of the project',
  })
  @IsUUID()
  @IsNotEmpty()
  projectId: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174001',
    description: 'The unique ID of the milestone (if applicable)',
  })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiProperty({
    example: 5000,
    description: 'The amount to be paid (in the smallest currency unit, e.g., paise for INR)',
  })
  @IsInt()
  @Min(100)
  @Max(100_000_000)
  amount: number;

  @ApiPropertyOptional({
    example: 'INR',
    default: 'INR',
    description: 'The currency code (ISO 4217)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string = 'INR';

  @ApiPropertyOptional({ example: 'pm_123...', description: 'ID of a saved payment method to use' })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}
