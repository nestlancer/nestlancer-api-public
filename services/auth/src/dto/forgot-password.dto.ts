import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { Trim } from '@nestlancer/common';

/**
 * Data required to initiate a secure password recovery flow.
 */
export class ForgotPasswordDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The registered primary email address for the account',
  })
  @IsEmail()
  @Trim()
  email: string;

  @ApiPropertyOptional({
    description:
      'Cloudflare Turnstile token. Required when TURNSTILE_SECRET_KEY is set in Infisical.',
    example: '0.xtoken...',
  })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
