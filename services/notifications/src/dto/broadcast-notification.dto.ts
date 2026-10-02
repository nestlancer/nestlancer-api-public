import { IsString, IsOptional, IsArray, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel } from '@nestlancer/common';

/**
 * Data Transfer Object for broadcasting a notification to all users.
 */
export class BroadcastNotificationDto {
  @ApiProperty({
    example: 'System Maintenance',
    description: 'Title of the broadcast notification',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'The system will be down for maintenance at midnight.',
    description: 'Main content of the broadcast',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    example: ['550e8400-e29b-41d4-a716-446655440001'],
    description: 'Users to exclude from this broadcast',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  excludeUserIds?: string[];

  @ApiPropertyOptional({
    enum: NotificationChannel,
    isArray: true,
    description: 'Specific delivery channels',
  })
  @IsOptional()
  @IsArray()
  channels?: NotificationChannel[];

  @ApiPropertyOptional({
    example: '2026-03-10T00:00:00Z',
    description: 'When to trigger the broadcast',
  })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
