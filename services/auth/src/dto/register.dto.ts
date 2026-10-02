import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
  IsOptional,
  Length,
} from 'class-validator';
import { Trim } from '@nestlancer/common';

/**
 * Data required to register a new user account.
 */
export class RegisterDto {
  @ApiProperty({
    example: 'newuser@example.com',
    description: 'Unique email address for registration',
  })
  @IsEmail()
  @Trim()
  email: string;

  @ApiProperty({
    example: 'SecureP@ss123',
    description:
      'Account password. Must be 8-64 characters and include uppercase, lowercase, number, and special character.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @ApiProperty({ example: 'John', description: 'User first name' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Trim()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'User last name' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Trim()
  lastName: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Contact phone number in E.164 format',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid E.164 format',
  })
  phone?: string;

  @ApiProperty({ example: true, description: 'Acceptance of platform terms of service' })
  @IsBoolean()
  acceptTerms: boolean;

  @ApiPropertyOptional({ example: false, description: 'Consent for marketing communications' })
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @ApiPropertyOptional({
    description:
      'Cloudflare Turnstile token. Required when TURNSTILE_SECRET_KEY is set in Infisical.',
    example: '0.xtoken...',
  })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
