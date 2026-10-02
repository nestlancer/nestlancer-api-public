import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object representing user notification preferences.
 */
export class PreferencesResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Channel-specific preference settings' })
  preferences: Record<string, any>;

  @ApiProperty({ description: 'Quiet hours configuration' })
  quietHours: any;

  @ApiProperty({
    example: '2026-03-08T10:00:00Z',
    description: 'When preferences were last updated',
  })
  updatedAt: Date;
}
