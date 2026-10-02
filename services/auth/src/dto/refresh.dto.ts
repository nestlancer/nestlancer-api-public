import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Data required to refresh an expired access token.
 */
export class RefreshTokenDto {
  @ApiProperty({
    example: 'ref_tok_1234567890abcdef',
    description: 'The valid refresh token issued during login',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
