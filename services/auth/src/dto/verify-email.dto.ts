import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Data required to verify a user's email address.
 */
export class VerifyEmailDto {
  @ApiProperty({
    example: 'ver_tok_12345678',
    description: 'The email verification token received via email',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
