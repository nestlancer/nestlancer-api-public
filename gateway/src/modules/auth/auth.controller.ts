import { Controller, Post, Get, Body, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { Request } from 'express';

import { OptionalJwtAuthGuard } from '@nestlancer/auth-lib';
import { Public, ApiStandardResponses } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Auth Gateway Controller
 * Routes authentication requests to the Auth Service
 */
@Controller('auth')
@ApiTags('auth')
@ApiStandardResponses()
export class AuthController {
  constructor(private readonly proxy: HttpProxyService) {}

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Post('logout')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout current session',
    description:
      'Revokes the refresh-token session. Body: `{ "refreshToken": "..." }`. Public so clients can sign out when the access token is already expired. Send Authorization when possible to revoke the access JWT immediately.',
  })
  async logout(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout all sessions',
    description: 'Invalidate every refresh-token session for the authenticated user (all devices).',
  })
  async logoutAll(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Post('end-impersonation')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'End own impersonation session',
    description:
      'Client-portal support sessions call this on Stop and return so the server grant ends without relying on the admin tab.',
  })
  async endOwnImpersonation(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  async verifyEmail(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  async forgotPassword(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Post('check-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check email availability' })
  async checkEmailPost(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  /** @deprecated Prefer POST /check-email */
  @Get('check-email')
  @Public()
  @ApiOperation({ summary: 'Check email availability (deprecated GET)' })
  async checkEmail(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Post('verify-2fa')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete 2FA verification' })
  async verify2FA(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend verification email' })
  async resendVerification(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Auth service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('auth', req);
  }
}
