import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for updating user account security credentials.
 */
export class ChangePasswordDto {
  @ApiProperty({ description: 'The current password for verification', example: 'OldPass123!' })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password meeting complexity requirements',
    example: 'NewSecurePass99!',
    minLength: 8,
    maxLength: 64,
    format: 'password',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;

  @ApiProperty({ description: 'Confirmation of the new password', example: 'NewSecurePass99!' })
  @IsString()
  confirmPassword: string;
}
