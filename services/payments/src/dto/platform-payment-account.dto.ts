import {
  Allow,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlatformPaymentAccountType } from '@prisma/client';

export class CreatePlatformPaymentAccountDto {
  @ApiProperty({ example: 'HDFC Current — Nestlancer' })
  @Transform(({ value, obj }) => value ?? obj.accountName)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  /** Alias accepted by older clients / audit docs (PAY-005). */
  @ApiPropertyOptional({
    description: 'Deprecated alias for `label`',
    deprecated: true,
    example: 'HDFC Current — Nestlancer',
  })
  @Allow()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountName?: string;

  @ApiProperty({ enum: PlatformPaymentAccountType })
  @IsEnum(PlatformPaymentAccountType)
  type: PlatformPaymentAccountType;

  @ApiPropertyOptional({ example: 'Nestlancer Pvt Ltd' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountHolderName?: string;

  @ApiPropertyOptional({ example: 'HDFC Bank' })
  @ValidateIf((o) => o.type === 'BANK' || o.type === 'BOTH')
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional({ example: '50200012345678' })
  @ValidateIf((o) => o.type === 'BANK' || o.type === 'BOTH')
  @IsOptional()
  @IsString()
  @MaxLength(40)
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'HDFC0001234' })
  @ValidateIf((o) => o.type === 'BANK' || o.type === 'BOTH')
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ifsc?: string;

  @ApiPropertyOptional({ example: 'current' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  accountType?: string;

  @ApiPropertyOptional({ example: 'nestlancer@hdfcbank' })
  @ValidateIf((o) => o.type === 'UPI' || o.type === 'BOTH')
  @IsOptional()
  @IsString()
  @MaxLength(120)
  upiVpa?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @Transform(({ value, obj }) => value ?? obj.isDefault)
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  /** Alias for `isPrimary` accepted by older clients / audit docs (PAY-005). */
  @ApiPropertyOptional({
    description: 'Deprecated alias for `isPrimary`',
    deprecated: true,
  })
  @Allow()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdatePlatformPaymentAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ enum: PlatformPaymentAccountType })
  @IsOptional()
  @IsEnum(PlatformPaymentAccountType)
  type?: PlatformPaymentAccountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  accountHolderName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  accountNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ifsc?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  accountType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  upiVpa?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @Transform(({ value, obj }) => value ?? obj.isDefault)
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  /** Alias for `isPrimary` (PAY-005). */
  @ApiPropertyOptional({
    description: 'Deprecated alias for `isPrimary`',
    deprecated: true,
  })
  @Allow()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
