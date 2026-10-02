import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { Trim } from '@nestlancer/common';

/**
 * Data required to resend an email verification link.
 */
export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address of the account to verify',
  })
  @IsEmail()
  @Trim()
  email: string;
}
