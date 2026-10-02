import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, Length, IsBoolean, IsOptional } from 'class-validator';

/**
 * Data required to complete the second factor of authentication during login.
 */
export class Verify2FADto {
  @ApiProperty({
    example: 'auth_sess_12345678',
    description:
      'The temporary authentication session ID issued after a successful first-factor login',
  })
  @IsString()
  @IsNotEmpty()
  authSessionId: string;

  @ApiProperty({
    example: '123456',
    description:
      'The numeric 6-digit TOTP code or an 8-10 character alphanumeric backup recovery code',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 10) // 6 for totp, 10 for backup
  code: string;

  @ApiProperty({
    example: 'totp',
    enum: ['totp', 'backupCode'],
    description: 'The type of second-factor verification being performed',
  })
  @IsString()
  @IsIn(['totp', 'backupCode'])
  method: 'totp' | 'backupCode';

  @ApiPropertyOptional({
    example: true,
    description: 'Match the remember-me choice from the initial login step',
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
