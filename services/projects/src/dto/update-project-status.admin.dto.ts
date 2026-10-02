import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Administrative DTO for overriding a project's operational status.
 */
export class UpdateProjectStatusAdminDto {
  @ApiProperty({
    description:
      'New status for the project. Operator aliases: PAUSED→ON_HOLD, ACTIVE→IN_PROGRESS.',
    example: 'ON_HOLD',
    enum: [
      'IN_PROGRESS',
      'ON_HOLD',
      'PAUSED',
      'ACTIVE',
      'REVIEW',
      'COMPLETED',
      'CANCELLED',
      'PAYMENT_OVERDUE',
      'SUSPENDED',
      'DISPUTED',
      'REVISION_REQUESTED',
    ],
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    description: 'Internal administrative reason for the status change',
    example: 'Payment dispute initiated by client.',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @ApiPropertyOptional({
    description: 'Whether to send a notification to the client about this status change',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  notifyClient?: boolean;
}
