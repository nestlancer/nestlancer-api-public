import { IsString, IsOptional, IsObject, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Universal DTO for standardized internal webhook processing.
 */
export class WebhookPayloadDto {
  @ApiProperty({
    description: 'The originating service provider (e.g., "razorpay", "stripe")',
    example: 'razorpay',
  })
  @IsString()
  provider: string;

  @ApiProperty({ description: 'Type of event being transmitted', example: 'payment.captured' })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({
    description: 'Unique identifier for the specific event instance',
    example: 'evt_123456789',
  })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 timestamp of event occurrence',
    example: '2023-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiProperty({
    description: 'Raw data object associated with the webhook event',
    example: { status: 'success', amount: 1000 },
    type: 'object',
  })
  @IsObject()
  data: Record<string, any>;
}
