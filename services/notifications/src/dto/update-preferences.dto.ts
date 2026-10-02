import { Type, Transform } from 'class-transformer';
import {
  Allow,
  IsBoolean,
  IsOptional,
  ValidateNested,
  IsString,
  IsObject,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';

/**
 * Preferences for specific delivery channels.
 */
export class ChannelPreferencesDto {
  @ApiProperty({ example: true, description: 'Enable/disable email notifications' })
  @IsBoolean()
  email: boolean;

  @ApiProperty({ example: true, description: 'Enable/disable push notifications' })
  @IsBoolean()
  push: boolean;

  @ApiProperty({ example: true, description: 'Enable/disable in-app notifications' })
  @IsBoolean()
  inApp: boolean;
}

/**
 * Configuration for quiet hours to suppress notifications.
 */
export class QuietHoursDto {
  @ApiPropertyOptional({ example: '22:00', description: 'Start time of quiet hours (HH:mm)' })
  @ValidateIf((_, v) => v != null)
  @IsString()
  start?: string | null;

  @ApiPropertyOptional({ example: '08:00', description: 'End time of quiet hours (HH:mm)' })
  @ValidateIf((_, v) => v != null)
  @IsString()
  end?: string | null;

  @ApiPropertyOptional({
    example: 'Asia/Kolkata',
    description: 'IANA timezone used to evaluate quiet-hours start/end',
  })
  @ValidateIf((_, v) => v != null)
  @IsString()
  timezone?: string | null;
}

/**
 * Data Transfer Object for updating notification preferences.
 */
@ApiExtraModels(ChannelPreferencesDto, QuietHoursDto)
export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Map of category names to channel preferences',
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(ChannelPreferencesDto) },
  })
  @IsOptional()
  @IsObject()
  preferences?: Record<string, ChannelPreferencesDto>;

  /** Alias for `preferences` — matches the GET response shape auditors / UI may PATCH back (NL-BUG-MSG-002). */
  @ApiPropertyOptional({
    description: 'Alias for preferences (same shape as GET quietHours sibling channels map)',
    type: 'object',
    additionalProperties: { $ref: getSchemaPath(ChannelPreferencesDto) },
  })
  @IsOptional()
  @IsObject()
  channels?: Record<string, ChannelPreferencesDto>;

  @ApiPropertyOptional({
    description: 'Quiet hours settings. Null start/end (as returned by GET) clears quiet hours.',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null) return undefined;
    return value;
  })
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto;

  /** Allowed when clients PATCH the GET body back (NL-BUG-MSG-002). */
  @Allow()
  @IsOptional()
  userId?: string;

  @Allow()
  @IsOptional()
  updatedAt?: string;
}
