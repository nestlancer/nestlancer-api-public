import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object representing a notification response.
 */
export class NotificationResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Unique notification ID',
  })
  id: string;

  @ApiProperty({ example: 'GENERAL', description: 'Type of notification' })
  type: string;

  @ApiProperty({ example: 'New Message', description: 'Title of the notification' })
  title: string;

  @ApiProperty({
    example: 'You have a new message from John.',
    description: 'Body content of the notification',
  })
  message: string;

  @ApiPropertyOptional({ description: 'Additional metadata associated with the notification' })
  data: any;

  @ApiPropertyOptional({
    example: '/messages/123',
    description: 'URL to redirect user when notification is clicked',
  })
  actionUrl: string;

  @ApiPropertyOptional({
    example: '2026-03-08T12:00:00Z',
    description: 'When the notification was read',
  })
  readAt: Date | null;

  @ApiPropertyOptional({ example: null, description: 'When the notification was dismissed' })
  dismissedAt: Date | null;

  @ApiProperty({
    example: '2026-03-08T10:00:00Z',
    description: 'When the notification was created',
  })
  createdAt: Date;
}
