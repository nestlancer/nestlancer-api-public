import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Valid urgency levels for system announcements.
 */
export enum AnnouncementType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

/**
 * DTO for broadcasting system-wide notifications to all active users.
 */
export class SendAnnouncementDto {
  @ApiProperty({
    description: 'Short, descriptive header for the announcement',
    example: 'Scheduled Maintenance',
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Detailed body text of the announcement',
    example: 'The system will be offline for 15 minutes at midnight UTC.',
  })
  @IsString()
  @MaxLength(1000)
  message: string;

  @ApiProperty({
    description: 'The severity level determining announcement styling and behavior',
    enum: AnnouncementType,
    example: AnnouncementType.INFO,
  })
  @IsEnum(AnnouncementType)
  type: AnnouncementType;

  @ApiPropertyOptional({
    description: 'Whether users can manually hide this announcement',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  dismissable?: boolean;

  @ApiPropertyOptional({
    description: 'ISO 8601 timestamp for when to start displaying this announcement',
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 timestamp for when to stop displaying this announcement',
    example: '2023-01-01T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
