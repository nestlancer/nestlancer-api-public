import { IsObject, IsBoolean, IsOptional, ValidateNested, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Configuration for email-based notifications.
 */
class EmailNotificationsDto {
  @ApiPropertyOptional({ description: 'Enable/disable project update emails', example: true })
  @IsOptional()
  @IsBoolean()
  projectUpdates?: boolean;

  @ApiPropertyOptional({ description: 'Enable/disable payment reminder emails', example: true })
  @IsOptional()
  @IsBoolean()
  paymentReminders?: boolean;

  @ApiPropertyOptional({ description: 'Enable/disable marketing emails', example: false })
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;

  @ApiPropertyOptional({
    description: 'Frequency of account activity digests',
    enum: ['daily', 'weekly', 'never'],
    example: 'weekly',
  })
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'never'])
  digest?: 'daily' | 'weekly' | 'never';
}

/**
 * Configuration for mobile/web push notifications.
 */
class PushNotificationsDto {
  @ApiPropertyOptional({ description: 'Enable/disable message push notifications', example: true })
  @IsOptional()
  @IsBoolean()
  messages?: boolean;

  @ApiPropertyOptional({
    description: 'Enable/disable project update push notifications',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  projectUpdates?: boolean;
}

/**
 * Wrapper for notification preference categories.
 */
class NotificationsDto {
  @ApiPropertyOptional({ description: 'Email notification settings', type: EmailNotificationsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmailNotificationsDto)
  email?: EmailNotificationsDto;

  @ApiPropertyOptional({ description: 'Push notification settings', type: PushNotificationsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PushNotificationsDto)
  push?: PushNotificationsDto;
}

/**
 * Configuration for account and profile privacy.
 */
class PrivacyPreferencesDto {
  @ApiPropertyOptional({
    description: 'Determines who can view the user profile',
    enum: ['public', 'private', 'connections'],
    example: 'public',
  })
  @IsOptional()
  @IsString()
  @IsIn(['public', 'private', 'connections'])
  profileVisibility?: 'public' | 'private' | 'connections';

  @ApiPropertyOptional({ description: 'Whether to expose email on public profile', example: false })
  @IsOptional()
  @IsBoolean()
  showEmail?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to expose phone number on public profile',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  showPhone?: boolean;
}

/**
 * Root DTO for managing user application preferences.
 */
export class UpdatePreferencesDto {
  @ApiPropertyOptional({ description: 'Notification preference overrides', type: NotificationsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationsDto)
  notifications?: NotificationsDto;

  @ApiPropertyOptional({
    description: 'Privacy and visibility overrides',
    type: PrivacyPreferencesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrivacyPreferencesDto)
  privacy?: PrivacyPreferencesDto;
}
