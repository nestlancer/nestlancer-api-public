import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for permanent user account termination requests.
 */
export class DeleteAccountDto {
  @ApiPropertyOptional({
    description: 'The user password for verification (required for non-OAuth users)',
    example: 'UserSecretPassword123!',
    format: 'password',
  })
  @IsString()
  password?: string; // Optional if using OAuth, but required if standard login

  @ApiProperty({
    description: 'Primary reason for account deletion',
    example: 'Privacy concerns',
    maxLength: 50,
  })
  @IsString()
  @MaxLength(50)
  reason: string;

  @ApiPropertyOptional({
    description: 'Detailed qualitative feedback on the platform experience',
    example: 'The platform was missing specific integration support for my region.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedback?: string;
}
