import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

/** POST body for email availability check — keeps Turnstile token out of query strings. */
export class CheckEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description:
      'Cloudflare Turnstile token. Required when TURNSTILE_SECRET_KEY is set in Infisical.',
  })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
