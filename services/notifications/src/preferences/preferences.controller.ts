import { Controller, Get, Patch, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { PreferencesResponseDto } from '../dto/preferences-response.dto';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@nestlancer/auth-lib';
import { ApiStandardResponse, ApiStandardResponses } from '@nestlancer/common';

/**
 * Controller for managing user notification preferences.
 */
@ApiTags('Notification Preferences')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiStandardResponses()
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  /**
   * Retrieves the comprehensive notification routing and channel preferences for the current user.
   *
   * @param user The metadata of the currently authenticated user
   * @returns A promise resolving to the user's notification settings
   */
  @Get('preferences')
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Access your personalized settings for how and where you receive notifications.',
  })
  @ApiStandardResponse(PreferencesResponseDto)
  async getPreferences(@CurrentUser() user: AuthenticatedUser): Promise<any> {
    return this.preferencesService.getPreferences(user.userId);
  }

  /**
   * Executes a wholesale update of the user's notification settings and channel configurations.
   *
   * @param user The metadata of the currently authenticated user
   * @param dto The partial or complete update payload for notification preferences
   * @returns A promise resolving to the updated preference record
   */
  @Patch('preferences')
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Modify your routing rules and delivery channel status for system notifications.',
  })
  @ApiStandardResponse(PreferencesResponseDto)
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<any> {
    return this.preferencesService.updatePreferences(user.userId, dto);
  }

  /**
   * Retrieves available notification channels.
   */
  @Get('channels')
  @ApiOperation({ summary: 'Get available delivery channels' })
  @ApiStandardResponse(Object)
  async getNotificationChannels(): Promise<any> {
    return this.preferencesService.getChannels();
  }

  /**
   * Alias for retrieving available delivery channels.
   */
  @Get('preferences/channels')
  @ApiOperation({ summary: 'Get delivery channels (Alias)' })
  @ApiStandardResponse(Object)
  async getChannels(): Promise<any> {
    return this.preferencesService.getChannels();
  }

  /**
   * Updates preference for a specific delivery channel.
   */
  @Patch('preferences/channel/:channel')
  @ApiOperation({ summary: 'Update specific channel preference' })
  @ApiStandardResponse(Object)
  async updateChannel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('channel') channel: string,
    @Body() body: { enabled: boolean },
  ): Promise<any> {
    const pref = await this.preferencesService.getPreferences(user.userId);
    const raw = pref.preferences;
    const currentPrefs: Record<string, { email: boolean; push: boolean; inApp: boolean }> =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? { ...(raw as Record<string, { email: boolean; push: boolean; inApp: boolean }>) }
        : {};
    const existing = currentPrefs[channel] ?? { email: true, push: true, inApp: true };
    currentPrefs[channel] = { ...existing, inApp: body.enabled };

    await this.preferencesService.updatePreferences(user.userId, { preferences: currentPrefs });

    return { userId: user.userId, channel, enabled: body.enabled, updated: true };
  }
}
