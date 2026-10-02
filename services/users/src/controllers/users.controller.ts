import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiStandardResponse, ApiStandardResponses, Public } from '@nestlancer/common';
import { ActiveUser, JwtAuthGuard } from '@nestlancer/auth-lib';
import { ProfileService } from '../services/profile.service';
import { PreferencesService } from '../services/preferences.service';
import { AvatarService } from '../services/avatar.service';
import { SessionsService } from '../services/sessions.service';
import { AccountService } from '../services/account.service';
import { TwoFactorService } from '../services/two-factor.service';
import { ActivityService } from '../services/activity.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { DeleteAccountDto } from '../dto/delete-account.dto';
import { Enable2FADto } from '../dto/enable-2fa.dto';
import { Verify2FASetupDto } from '../dto/verify-2fa-setup.dto';
import { Disable2FADto } from '../dto/disable-2fa.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

/**
 * Controller for managing user profile, security, and account settings.
 */
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
@ApiStandardResponses()
export class UsersController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly preferencesService: PreferencesService,
    private readonly avatarService: AvatarService,
    private readonly sessionsService: SessionsService,
    private readonly accountService: AccountService,
    private readonly twoFactorService: TwoFactorService,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * Public health check for the users service.
   */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiStandardResponse()
  healthCheck(): any {
    return { status: 'ok', service: 'users' };
  }

  // --- Profile Management ---

  /**
   * Retrieves the complete profile for the authenticated user.
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiStandardResponse()
  async getProfile(@ActiveUser('sub') userId: string): Promise<any> {
    return this.profileService.getProfile(userId);
  }

  /**
   * Updates specific fields in the user's profile.
   */
  @Patch('profile')
  @ApiOperation({ summary: 'Update profile' })
  @ApiStandardResponse({ message: 'Profile updated successfully' })
  async updateProfile(
    @ActiveUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<any> {
    return this.profileService.updateProfile(userId, dto);
  }

  /**
   * Uploads and sets a new profile avatar image.
   */
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiStandardResponse({ message: 'Avatar uploaded successfully' })
  async uploadAvatar(
    @ActiveUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    return this.avatarService.uploadAvatar(userId, file);
  }

  /**
   * Removes the current profile avatar image.
   */
  @Delete('avatar')
  @ApiOperation({ summary: 'Remove avatar' })
  @ApiStandardResponse({ message: 'Avatar removed successfully' })
  async removeAvatar(@ActiveUser('sub') userId: string): Promise<any> {
    return this.avatarService.removeAvatar(userId);
  }

  /**
   * Retrieves the user's application and notification preferences.
   */
  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  @ApiStandardResponse()
  async getPreferences(@ActiveUser('sub') userId: string): Promise<any> {
    return this.preferencesService.getPreferences(userId);
  }

  /**
   * Updates user's application and notification preferences.
   */
  @Patch('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiStandardResponse({ message: 'Preferences updated successfully' })
  async updatePreferences(
    @ActiveUser('sub') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ): Promise<any> {
    return this.preferencesService.updatePreferences(userId, dto);
  }

  // --- Password & Security ---

  /**
   * Updates the account password using the current password for verification.
   */
  @Patch('password')
  @ApiOperation({ summary: 'Change password' })
  @ApiStandardResponse({ message: 'Password changed successfully' })
  async changePassword(
    @ActiveUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<any> {
    return this.profileService.changePassword(userId, dto);
  }

  /**
   * Formal endpoint for updating account password (POST alias).
   */
  @Post('change-password')
  @ApiOperation({ summary: 'Change password (POST)' })
  @ApiStandardResponse({
    message: 'Password changed successfully. Please login with your new password.',
  })
  async changePasswordPost(
    @ActiveUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<any> {
    return this.profileService.changePassword(userId, dto);
  }

  // --- Two-Factor Authentication ---

  /**
   * Starts the 2FA enrollment process by generating a TOTP secret.
   */
  @Post('2fa/enable')
  @ApiOperation({ summary: 'Initiate 2FA setup' })
  @ApiStandardResponse({ message: '2FA setup initiated' })
  async enable2FA(@ActiveUser('sub') userId: string, @Body() dto: Enable2FADto): Promise<any> {
    return this.twoFactorService.enable2FA(userId, dto);
  }

  /**
   * Finalizes 2FA setup by verifying the first generated TOTP code.
   */
  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verify and finalize 2FA' })
  @ApiStandardResponse({ message: '2FA enabled successfully' })
  async verify2FASetup(
    @ActiveUser('sub') userId: string,
    @Body() dto: Verify2FASetupDto,
  ): Promise<any> {
    return this.twoFactorService.verify2FASetup(userId, dto);
  }

  /**
   * Permanently disables Multi-Factor Authentication for the account.
   */
  @Post('2fa/disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiStandardResponse({ message: '2FA disabled successfully' })
  async disable2FA(@ActiveUser('sub') userId: string, @Body() dto: Disable2FADto): Promise<any> {
    return this.twoFactorService.disable2FA(userId, dto);
  }

  /**
   * Returns whether 2FA is currently active for the user account.
   */
  @Get('2fa/status')
  @ApiOperation({ summary: 'Get 2FA status' })
  @ApiStandardResponse()
  async get2FAStatus(@ActiveUser('sub') userId: string): Promise<any> {
    return this.twoFactorService.get2FAStatus(userId);
  }

  /**
   * Retrieves current recovery/backup codes for Multi-Factor Authentication.
   */
  @Get('2fa/backup-codes')
  @ApiOperation({ summary: 'Get 2FA backup codes' })
  @ApiStandardResponse()
  async getBackupCodes(@ActiveUser('sub') userId: string): Promise<any> {
    return this.twoFactorService.getBackupCodes(userId);
  }

  /**
   * Generates a fresh set of recovery/backup codes for 2FA.
   */
  @Post('2fa/regenerate-codes')
  @ApiOperation({ summary: 'Regenerate 2FA backup codes' })
  @ApiStandardResponse({ message: 'Backup codes regenerated' })
  async regenerateBackupCodes(
    @ActiveUser('sub') userId: string,
    @Body() dto: Enable2FADto,
  ): Promise<any> {
    return this.twoFactorService.regenerateBackupCodes(userId, dto);
  }

  // --- Session Management ---

  /**
   * Lists all active login sessions for the current user.
   */
  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions' })
  @ApiStandardResponse()
  async getSessions(
    @ActiveUser('sub') userId: string,
    @ActiveUser('jti') jti: string,
  ): Promise<any> {
    return this.sessionsService.getSessions(userId, jti);
  }

  /**
   * Retrieves specific metadata for a single active login session.
   */
  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get session details' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiStandardResponse()
  async getSessionDetails(
    @ActiveUser('sub') userId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<any> {
    return this.sessionsService.getSessionById(userId, sessionId);
  }

  /**
   * Immediately terminates a specific login session.
   */
  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Terminate specific session' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiStandardResponse({ message: 'Session terminated successfully' })
  async terminateSession(
    @ActiveUser('sub') userId: string,
    @Param('sessionId') sessionId: string,
    @ActiveUser('jti') jti: string,
  ): Promise<any> {
    return this.sessionsService.terminateSession(userId, sessionId, jti);
  }

  /**
   * Revokes all active user sessions except for the current one.
   */
  @Post('sessions/terminate-others')
  @ApiOperation({ summary: 'Terminate all other sessions' })
  @ApiStandardResponse({ message: 'All other sessions terminated successfully' })
  async terminateOtherSessions(
    @ActiveUser('sub') userId: string,
    @ActiveUser('jti') jti: string,
  ): Promise<any> {
    return this.sessionsService.terminateOtherSessions(userId, jti);
  }

  // --- Account Management ---

  /**
   * Schedules the account for permanent deletion after a grace period.
   */
  @Post('delete-account')
  @ApiOperation({ summary: 'Request account deletion' })
  @ApiStandardResponse({
    message: 'Account deletion scheduled. You have 30 days to cancel this request.',
  })
  async deleteAccount(
    @ActiveUser('sub') userId: string,
    @Body() dto: DeleteAccountDto,
  ): Promise<any> {
    return this.accountService.requestAccountDeletion(userId, dto);
  }

  /**
   * Aborts a previously scheduled account deletion request.
   */
  @Post('cancel-deletion')
  @ApiOperation({ summary: 'Cancel deletion request' })
  @ApiStandardResponse({ message: 'Account deletion cancelled successfully.' })
  async cancelDeletion(@ActiveUser('sub') userId: string): Promise<any> {
    return this.accountService.cancelDeletionRequest(userId);
  }

  // --- Activity & Data Export ---

  /**
   * Retrieves a paginated history of user account and platform activities.
   */
  @Get('activity')
  @ApiOperation({ summary: 'Get user activity log' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiStandardResponse()
  async getActivity(
    @ActiveUser('sub') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<any> {
    return this.activityService.getActivityLog(userId, parseInt(page, 10), parseInt(limit, 10));
  }

  /**
   * Triggers a job to prepare a complete archive of user data for export.
   */
  @Get('export')
  @ApiOperation({ summary: 'Request data export' })
  @ApiStandardResponse()
  async requestDataExport(@ActiveUser('sub') userId: string): Promise<any> {
    return this.activityService.requestDataExport(userId);
  }

  /**
   * Formal endpoint for requesting data export (Spec compliant alias).
   */
  @Get('data-export')
  @ApiOperation({ summary: 'Request data export (alias)' })
  @ApiStandardResponse()
  async requestDataExportAlias(@ActiveUser('sub') userId: string): Promise<any> {
    return this.activityService.requestDataExport(userId);
  }

  /**
   * Direct download of a previously generated data export archive.
   */
  @Get('export/:id')
  @ApiOperation({ summary: 'Download data export' })
  @ApiParam({ name: 'id', description: 'Export Job UUID' })
  @ApiStandardResponse()
  async downloadDataExport(
    @ActiveUser('sub') userId: string,
    @Param('id') exportId: string,
  ): Promise<any> {
    return this.activityService.downloadDataExport(userId, exportId);
  }
}
