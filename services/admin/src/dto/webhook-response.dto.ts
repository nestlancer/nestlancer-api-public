import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Details of an outbound system webhook configuration.
 */
export class WebhookResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the webhook configuration',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({ description: 'The friendly name of the webhook', example: 'External Logging' })
  name: string;

  @ApiProperty({
    description: 'The destination URL where payloads are delivered',
    example: 'https://webhook.site/xxx',
  })
  url: string;

  @ApiProperty({
    description: 'List of events this webhook is subscribed to',
    example: ['user.created', 'order.paid'],
  })
  events: string[];

  @ApiProperty({ description: 'Whether the webhook is currently active', example: true })
  enabled: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp of the most recent delivery attempt',
    example: '2023-01-01T12:00:00.000Z',
  })
  lastDeliveryAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Historical percentage of successful deliveries (0-100)',
    example: 98.5,
  })
  successRate?: number;

  @ApiProperty({
    description: 'ISO 8601 timestamp of configuration creation',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
