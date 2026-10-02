import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Payload for triggering a test webhook delivery.
 */
export class TestWebhookDto {
  @ApiProperty({ example: 'project.created', description: 'The event type to simulate' })
  @IsString()
  event: string;
}
