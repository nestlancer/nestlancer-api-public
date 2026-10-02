import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Data required to securely reset an account password using a unique verification token.
 */
export class ResetPasswordDto {
  @ApiProperty({
    example: 'pwd_tok_12345678',
    description: 'The unique password reset token received via email',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    example: 'NewSecureP@ss123!',
    description:
      'The new account password. Must be 8-64 characters and include uppercase, lowercase, number, and special character.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword?: string;

  @ApiPropertyOptional({
    description: 'Alias of newPassword accepted by the web client.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password?: string;

  @ApiPropertyOptional({
    description:
      'Cloudflare Turnstile token. Required when TURNSTILE_SECRET_KEY is set in Infisical.',
  })
  @IsOptional()
  @IsString()
  turnstileToken?: string;
}
