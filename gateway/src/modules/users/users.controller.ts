import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { Request } from 'express';

import { ApiStandardResponses, Public } from '@nestlancer/common';
import { Permissions } from '@nestlancer/auth-lib';
import { UsersService } from './users.service';
import { HttpProxyService } from '../../proxy';

/**
 * Users Gateway Controller
 * Routes user management requests to the Users Service
 */
@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
@ApiStandardResponses()
export class UsersController {
  constructor(
    private readonly proxy: HttpProxyService,
    private readonly usersService: UsersService,
  ) {}

  // --- Profile Management ---

  /** Legacy alias for GET /users/profile (returns 401 when access token is revoked). */
  @Get('me')
  @Permissions('users:read:own')
  @ApiOperation({
    summary: 'Get current user profile (legacy alias)',
    description: 'Alias for GET /users/profile. Returns 401 when the access token is revoked.',
  })
  async getMe(@Req() req: Request) {
    return this.getProfile(req);
  }

  @Get('profile')
  @Permissions('users:read:own')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      '**Replaces the deprecated `/users/me` path.** Use this endpoint for all profile reads.',
  })
  async getProfile(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload avatar' })
  async uploadAvatar(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Remove avatar' })
  async removeAvatar(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  async getPreferences(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  // --- Password & Security ---

  @Post('change-password')
  @ApiOperation({ summary: 'Change password' })
  async changePassword(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  // --- Two-Factor Authentication ---

  @Post('2fa/enable')
  @ApiOperation({ summary: 'Start 2FA setup' })
  async enable2FA(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  /** Alias expected by system e2e / some clients */
  @Post('2fa/setup')
  @ApiOperation({ summary: 'Start 2FA setup (alias of 2fa/enable)' })
  async setup2FA(@Req() req: Request) {
    return this.proxy.forward('users', req, undefined, '/api/v1/users/2fa/enable');
  }

  @Post('2fa/verify')
  @ApiOperation({ summary: 'Complete 2FA setup' })
  async verify2FA(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('2fa/verify-setup')
  @ApiOperation({ summary: 'Complete 2FA setup (alias of 2fa/verify)' })
  async verifySetup2FA(@Req() req: Request) {
    return this.proxy.forward('users', req, undefined, '/api/v1/users/2fa/verify');
  }

  @Post('2fa/disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  async disable2FA(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('2fa/status')
  @ApiOperation({ summary: 'Get 2FA status' })
  async get2FAStatus(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('2fa/backup-codes')
  @ApiOperation({ summary: 'Get backup codes' })
  async getBackupCodes(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('2fa/regenerate-codes')
  @ApiOperation({ summary: 'Regenerate backup codes' })
  async regenerateBackupCodes(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  // --- Session Management ---

  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions' })
  async getSessions(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('sessions/:sessionId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get session details' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async getSessionDetails(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Terminate specific session' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async terminateSession(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('sessions/terminate-others')
  @ApiOperation({ summary: 'Logout all other sessions' })
  async terminateOtherSessions(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  /** @doc POST /users/logout (API spec) – proxies to auth service */
  @Post('logout')
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@Req() req: Request) {
    return this.proxy.forward('auth', req, undefined, '/api/v1/auth/logout');
  }

  // --- Account Management ---

  @Post('delete-account')
  @ApiOperation({ summary: 'Request account deletion' })
  async deleteAccount(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('cancel-deletion')
  @ApiOperation({ summary: 'Cancel deletion request' })
  async cancelDeletion(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('dashboard-summary')
  @ApiOperation({
    summary: 'Aggregated client dashboard data',
    description:
      'Single BFF endpoint that loads project, request, payment, quote, messaging, notification, and activity slices in parallel server-side.',
  })
  async getDashboardSummary(@Req() req: Request) {
    const authorization = req.headers.authorization;
    if (!authorization) {
      throw new UnauthorizedException('Authorization header required');
    }
    return this.usersService.getDashboardSummary(authorization);
  }

  @Get('activity')
  @ApiOperation({ summary: 'View activity history' })
  async getActivity(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('data-export')
  @ApiOperation({ summary: 'Request GDPR data export' })
  async requestDataExport(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('export')
  @ApiOperation({ summary: 'Request GDPR data export (alias)' })
  async requestDataExportAlias(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('export/:id')
  @ApiOperation({ summary: 'Download a previously generated GDPR data export by job ID' })
  @ApiParam({ name: 'id', description: 'Export job UUID returned by POST /users/data-export' })
  async downloadDataExport(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Users service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }
}
