import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create / upsert a notification template.
 * Accepts either seed-style fields (titleTemplate/messageTemplate + channels array)
 * or legacy channels-object shape.
 */
export class CreateNotificationTemplateDto {
  @ApiProperty({ example: 'welcome_email', description: 'Unique name identifier for the template' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({
    example: 'request.submitted',
    description: 'The event type that triggers this template',
  })
  @IsString()
  eventType: string;

  @ApiPropertyOptional({ example: 'New request submitted' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleTemplate?: string;

  @ApiPropertyOptional({ example: '{{submitterName}} submitted "{{requestTitle}}".' })
  @IsOptional()
  @IsString()
  messageTemplate?: string;

  @ApiPropertyOptional({
    description: 'Channel list (e.g. ["IN_APP"]) or legacy channels object',
    type: 'object',
    additionalProperties: true,
    example: { IN_APP: true },
  })
  @IsOptional()
  channels?: Record<string, unknown> | string[];

  @ApiPropertyOptional({ example: 'NORMAL', enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'] })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
