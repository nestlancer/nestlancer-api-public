import { IsString, IsOptional, IsEmail, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@nestlancer/common';

/**
 * Administrative DTO for overriding user account details.
 */
export class AdminUpdateUserDto {
  @ApiPropertyOptional({ description: "User's first name override", example: 'Jane' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: "User's last name override", example: 'Smith' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Primary active email address of the user',
    example: 'jane.smith@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Account lifecycle status',
    enum: UserStatus,
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
