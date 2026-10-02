import { IsString, MinLength, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for deactivating Multi-Factor Authentication.
 */
export class Disable2FADto {
  @ApiProperty({
    description: 'User password for identity verification',
    example: 'UserSecret123!',
    format: 'password',
  })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiProperty({
    description: 'Current 6-digit TOTP code for final verification',
    example: '654321',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code: string;
}
