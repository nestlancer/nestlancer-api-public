import { IsString, IsOptional, IsBoolean, IsInt, IsIn, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for adding a new payment method.
 * Supports multiple payment types: card, upi, netbanking, and wallet.
 */
export class AddPaymentMethodDto {
  @ApiProperty({
    enum: ['card', 'upi', 'netbanking', 'wallet'],
    description: 'The type of payment method being added',
  })
  @IsString()
  @IsIn(['card', 'upi', 'netbanking', 'wallet'])
  type: 'card' | 'upi' | 'netbanking' | 'wallet';

  @ApiPropertyOptional({
    example: 'tok_visa',
    description: 'Provider-specific token representing the saved payment method',
  })
  @IsOptional()
  @IsString()
  tokenId?: string;

  @ApiPropertyOptional({
    example: '4242',
    description: 'Last 4 digits of the card (for identification)',
  })
  @IsOptional()
  @IsString()
  last4?: string;

  @ApiPropertyOptional({
    example: 'visa',
    description: 'The card network brand (e.g., visa, mastercard)',
  })
  @IsOptional()
  @IsString()
  cardBrand?: string;

  @ApiPropertyOptional({ example: 12, description: 'Card expiration month (1-12)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  cardExpMonth?: number;

  @ApiPropertyOptional({ example: 2028, description: 'Card expiration year' })
  @IsOptional()
  @IsInt()
  @Min(2024)
  @Max(2050)
  cardExpYear?: number;

  @ApiPropertyOptional({ example: 'user@okaxis', description: 'UPI VPA handle (for UPI payments)' })
  @IsOptional()
  @IsString()
  upiVpa?: string;

  @ApiPropertyOptional({ example: 'HDFC Bank', description: 'Name of the bank (for netbanking)' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({
    example: 'paytm',
    description: 'The wallet service provider (e.g., paytm, phonepe)',
  })
  @IsOptional()
  @IsString()
  walletProvider?: string;

  @ApiPropertyOptional({
    example: 'My Personal Visa',
    description: 'User-defined friendly name for this payment method',
  })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to set this method as the default for future payments',
  })
  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean;
}
