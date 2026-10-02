import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for bulk marking specific notifications as read.
 */
export class MarkSelectedReadDto {
  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'List of notification IDs to mark as read',
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  notificationIds: string[];
}
