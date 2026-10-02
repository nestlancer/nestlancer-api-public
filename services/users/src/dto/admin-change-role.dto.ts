import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@nestlancer/common';

/**
 * Administrative DTO for reassigning user access levels.
 */
export class AdminChangeRoleDto {
  @ApiProperty({
    description: 'The target system role to assign to the user',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
