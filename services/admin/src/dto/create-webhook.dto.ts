import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Configuration for webhook retry logic on delivery failure.
 */
export class RetryPolicyDto {
  @ApiPropertyOptional({ example: 3, description: 'Maximum number of delivery attempts' })
  @IsOptional()
  maxRetries?: number;

  @ApiPropertyOptional({ example: 60, description: 'Seconds to wait between retry attempts' })
  @IsOptional()
  backoffSeconds?: number;
}

/**
 * Data Transfer Object for creating a new system webhook.
 */
export class CreateWebhookDto {
  @ApiProperty({
    example: 'Project Updates',
    description: 'Friendly name for the webhook configuration',
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'https://api.example.com/webhooks/projects',
    description: 'The target URL to receive event payloads',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    example: ['project.created', 'project.updated'],
    description: 'List of system event types to subscribe to',
  })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({
    example: { 'X-Custom-Header': 'value' },
    description: 'Additional HTTP headers to include in delivery',
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    example: 'whsec_...',
    description: 'Shared secret used to sign payloads for security verification',
  })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the webhook is active and receiving events',
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    type: () => RetryPolicyDto,
    description: 'Custom retry settings for this webhook',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RetryPolicyDto)
  retryPolicy?: RetryPolicyDto;
}
