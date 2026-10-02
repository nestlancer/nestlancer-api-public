import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { ADMIN_CONFIG } from '../config/admin.config';

/**
 * Data required to initiate an administrative user impersonation session.
 */
export class ImpersonateUserDto {
  @ApiProperty({
    example: 'Investigating reported UI bug in project dashboard',
    description: 'Justification for the impersonation session for auditing purposes',
  })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiPropertyOptional({
    example: 'TICKET-1234',
    description: 'Optional support ticket ID associated with this request',
  })
  @IsOptional()
  @IsString()
  ticketId?: string;

  @ApiPropertyOptional({
    example: 60,
    minimum: 1,
    maximum: ADMIN_CONFIG.MAX_IMPERSONATION_DURATION_HOURS * 60,
    description:
      'How long the impersonation token stays valid, in minutes. Capped at the platform maximum.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(ADMIN_CONFIG.MAX_IMPERSONATION_DURATION_HOURS * 60)
  durationMinutes?: number;
}
