import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Headers,
  Res,
  HttpStatus,
  HttpCode,
  UseGuards,
  BadRequestException,
  SetMetadata,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiStandardResponse,
  ApiStandardResponses,
  ApiSuccessEnvelopeDto,
  ClientIp,
  IS_PUBLIC_KEY,
  Public,
  ResponseMetadataDto,
} from '@nestlancer/common';
import { JwtAuthGuard, ActiveUser } from '@nestlancer/auth-lib';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { LoginTokensDto, RegisterResultDto, TwoFactorChallengeDto } from '../dto/auth-response.dto';
import { Verify2FADto } from '../dto/verify-2fa.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { CheckEmailDto } from '../dto/check-email.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { RefreshTokenDto } from '../dto/refresh.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { TurnstileGuard } from '../guards/turnstile.guard';

import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiAcceptedResponse,
  ApiOkResponse,
  ApiExtraModels,
} from '@nestjs/swagger';

/**
 * Controller for public-facing authentication and account management operations.
 * Handles user registration, login, token refresh, and password recovery flows.
 *
 * @category Authentication
 */
@ApiTags('Authentication')
@Controller()
@Public() // Most routes in this controller do not require standard JWT access token yet
@ApiStandardResponses()
export class AuthPublicController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a new user account in the system.
   *
   * @param dto User registration details (email, password, etc.)
   * @param ipAddress The IP address of the registration request
   * @param res Express response object for setting status
   * @returns Basic user info and verification status
   */
  @Post('register')
  @UseGuards(TurnstileGuard)
  @ApiOperation({
    summary: 'Register new account',
    description: 'Create a new user account and trigger an email verification process.',
  })
  @ApiStandardResponse({
    type: RegisterResultDto,
    status: 201,
    message: 'Account created successfully. Please verify your email.',
  })
  async register(
    @Body() dto: RegisterDto,
    @ClientIp() ipAddress: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<any> {
    const result = await this.authService.register(dto, ipAddress);
    res.status(HttpStatus.CREATED);
    return {
      userId: result.user.id,
      email: result.user.email,
      emailVerificationSent: true,
      emailVerificationExpiresAt: result.emailVerificationExpiresAt,
    };
  }

  /**
   * Authenticates a user with email and password.
   * May return a full session or a requirement for 2FA.
   *
   * @param dto Login credentials
   * @param ipAddress The IP address of the login attempt
   * @param userAgent The user agent of the client
   * @param res Express response object for manual status management
   * @returns JWT tokens or 2FA challenge status
   */
  @Post('login')
  @UseGuards(TurnstileGuard)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate with credentials to obtain a session or trigger 2FA if enabled.',
  })
  @ApiStandardResponse({ type: LoginTokensDto, message: 'Login successful' })
  @ApiAcceptedResponse({
    description: 'Two-factor authentication required',
    type: TwoFactorChallengeDto,
  })
  async login(
    @Body() dto: LoginDto,
    @ClientIp() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Headers('origin') origin: string,
    @Headers('referer') referer: string,
    @Headers('host') host: string,
    @Headers('x-forwarded-host') forwardedHost: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginTokensDto | TwoFactorChallengeDto> {
    const result = await this.authService.login(dto, ipAddress, userAgent, {
      origin,
      referer,
      host,
      forwardedHost,
    });

    // Return challenge in the success envelope (do NOT throw HttpException).
    // Throwing was rewritten by AllExceptionsFilter into { status:'error', message }
    // and stripped authSessionId — clients then only saw "Two-factor authentication required".
    if ('requires2FA' in result && result.requires2FA === true) {
      res.status(HttpStatus.ACCEPTED);
      return result as TwoFactorChallengeDto;
    }

    return result as LoginTokensDto;
  }

  /**
   * Exchanges a valid refresh token for a new set of access and refresh tokens.
   *
   * @param dto The refresh token payload
   * @param ipAddress The IP address of the refresh request
   * @param userAgent The user agent of the client
   * @returns New JWT token pair
   */
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Obtain new access and refresh tokens using a valid refresh token.',
  })
  @ApiStandardResponse()
  async refresh(
    @Body() dto: RefreshTokenDto,
    @ClientIp() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<any> {
    return this.authService.refresh(dto, ipAddress, userAgent);
  }

  /**
   * Revokes the current refresh-token session (this device).
   * Request body must include the same `refreshToken` used for `/refresh`.
   * When called via the API gateway with a verified access token, `x-user-id`
   * is forwarded and must match the refresh token subject.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout current session',
    description:
      'Invalidate the session tied to the refresh token. Send `{ "refreshToken": "..." }`.',
  })
  @ApiStandardResponse({ message: 'Logged out successfully' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Headers('x-user-id') trustedUserId?: string,
    @Headers('authorization') authorization?: string,
  ): Promise<{ revoked: boolean }> {
    return this.authService.logout(dto, trustedUserId, authorization);
  }

  /**
   * Revokes every refresh-token session for the authenticated user (all devices).
   * Requires a valid access token (Authorization: Bearer).
   */
  @Post('logout-all')
  @SetMetadata(IS_PUBLIC_KEY, false)
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout all sessions',
    description:
      'Delete all stored sessions for the user. The current device will need to sign in again.',
  })
  @ApiStandardResponse({ message: 'All sessions revoked' })
  async logoutAll(@ActiveUser('sub') userId: string): Promise<{ revokedCount: number }> {
    return this.authService.logoutAll(userId);
  }

  /**
   * Ends the caller's own admin-impersonation grant (NL-BUG-IMP-3).
   * Called from the client portal "Stop and return" path so the server session
   * does not stay active when the admin tab is closed.
   */
  @Post('end-impersonation')
  @SetMetadata(IS_PUBLIC_KEY, false)
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'End own impersonation session',
    description:
      'Requires an impersonation access token. Marks the support session ended and revokes its access JTI.',
  })
  @ApiStandardResponse({ message: 'Impersonation ended' })
  async endOwnImpersonation(
    @ActiveUser()
    user: {
      sub?: string;
      userId?: string;
      isImpersonated?: boolean;
      impersonationSessionId?: string;
      jti?: string;
      exp?: number;
    },
  ): Promise<{ success: true; sessionId: string }> {
    return this.authService.endOwnImpersonation({
      userId: user.sub || user.userId || '',
      isImpersonated: user.isImpersonated,
      impersonationSessionId: user.impersonationSessionId,
      accessJti: user.jti,
      accessExp: user.exp,
    });
  }

  /**
   * Verifies a two-factor authentication (2FA) code.
   *
   * @param dto The 2FA verification token and code
   * @returns JWT session tokens upon successful verification
   */
  @Post('verify-2fa')
  @ApiOperation({
    summary: 'Verify 2FA code',
    description: 'Complete the login process by providing a valid 2FA code (TOTP or Backup).',
  })
  @ApiStandardResponse()
  async verify2fa(@Body() dto: Verify2FADto): Promise<any> {
    return this.authService.verify2FA(dto);
  }

  /**
   * Verifies a user's email address using a token.
   *
   * @param dto The email verification token
   * @returns Confirmation of email verification
   */
  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Confirm ownership of an email address using a token sent during registration or update.',
  })
  @ApiStandardResponse({ message: 'Email verified successfully' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<any> {
    return this.authService.verifyEmail(dto);
  }

  /**
   * Resends the email verification link to a user.
   *
   * @param dto User identifier for resending verification
   * @returns Success confirmation
   */
  @Post('resend-verification')
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Request a new email verification link if the previous one expired or was lost.',
  })
  @ApiStandardResponse({
    message: 'If your account requires verification, a new email has been sent.',
  })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<any> {
    await this.authService.resendVerification(dto);
    return { emailSent: true };
  }

  /**
   * Initiates the password recovery process.
   *
   * @param dto The email address of the account to recover
   * @param ipAddress The IP address of the request
   * @returns Success confirmation (regardless of account existence for security)
   */
  @Post('forgot-password')
  @UseGuards(TurnstileGuard)
  @ApiOperation({
    summary: 'Forgot password',
    description:
      'Send password reset instructions to the provided email address if an account exists.',
  })
  @ApiStandardResponse({
    message: 'If an account exists with this email, you will receive password reset instructions',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @ClientIp() ipAddress: string,
  ): Promise<any> {
    await this.authService.forgotPassword(dto, ipAddress);
    return { emailSent: true };
  }

  /**
   * Resets a user's password using a valid recovery token.
   *
   * @param dto The reset token and new password
   * @returns Confirmation of password reset
   */
  @Post('reset-password')
  @UseGuards(TurnstileGuard)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Set a new password for an account using a valid password recovery token.',
  })
  @ApiStandardResponse({ message: 'Password reset successfully' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<any> {
    return this.authService.resetPassword(dto);
  }

  /**
   * Checks if an email address is already registered.
   *
   * @param email The email address to check
   * @param token Turnstile verification token
   * @param ipAddress The IP address of the request
   * @returns Availability status
   */
  /**
   * Checks if an email address is already registered (POST — preferred).
   * Keeps the Turnstile token out of URLs and server access logs.
   */
  @Post('check-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TurnstileGuard)
  @ApiOperation({
    summary: 'Check email availability',
    description:
      'Verify if an email address is available or already in use. Send Turnstile token in the JSON body.',
  })
  @ApiStandardResponse()
  async checkEmailPost(@Body() dto: CheckEmailDto, @ClientIp() ipAddress: string): Promise<any> {
    const normalized = dto.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException('Invalid email format');
    }
    return this.authService.checkEmail(normalized, dto.turnstileToken, ipAddress);
  }

  /**
   * @deprecated Use POST /check-email with JSON body instead (Turnstile token must not be in the URL).
   */
  @Get('check-email')
  @UseGuards(TurnstileGuard)
  @ApiOperation({
    summary: 'Check email availability (deprecated GET)',
    description: 'Deprecated. Use POST /check-email with `{ email, turnstileToken }` in the body.',
  })
  @ApiStandardResponse()
  async checkEmail(
    @Query('email') email: string,
    @Query('turnstileToken') token: string,
    @ClientIp() ipAddress: string,
  ): Promise<any> {
    if (!email) {
      throw new BadRequestException('Email query parameter is required');
    }

    const normalized = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new BadRequestException('Invalid email format');
    }

    return this.authService.checkEmail(normalized, token, ipAddress);
  }

  /**
   * Connectivity and health check for the authentication service.
   *
   * @returns Basic status information
   */
  @Get('health')
  @ApiOperation({
    summary: 'Service health check',
    description: 'Verify that the authentication microservice is online and operational.',
  })
  @ApiStandardResponse()
  async healthCheck(): Promise<any> {
    return { status: 'ok', service: 'auth' };
  }
}
