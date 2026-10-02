import { IsArray, IsString, MaxLength, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@nestlancer/common';

/**
 * Data Transfer Object for sending a notification to specific recipients.
 */
export class SendNotificationDto {
  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'List of recipient user IDs',
  })
  @IsArray()
  @IsString({ each: true })
  recipientIds: string[];

  @ApiProperty({ example: 'New Message', description: 'Brief title of the notification' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'You have received a new message from John Doe.',
    description: 'The main content/body of the notification',
  })
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiPropertyOptional({
    description: 'Categorical type of the notification (free-form string, e.g. "system.e2e")',
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    description: 'Delivery channels to use',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    example: '2026-03-10T10:00:00Z',
    description: 'Scheduled time for future delivery',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
