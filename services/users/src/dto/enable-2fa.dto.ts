import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for initiating the Multi-Factor Authentication (MFA) setup process.
 */
export class Enable2FADto {
  @ApiProperty({
    description: 'User password for identity verification before 2FA activation',
    example: 'UserSecret123!',
    format: 'password',
  })
  @IsString()
  @MinLength(1)
  password: string;
}
