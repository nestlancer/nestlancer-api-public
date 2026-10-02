import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { BusinessLogicException } from '@nestlancer/common';
import { AccessTokenRevocationService } from '@nestlancer/cache';
import { PrismaWriteService } from '@nestlancer/database';
import { RegistrationService } from './registration.service';
import { LoginService } from './login.service';
import { TokenService } from './token.service';
import { PasswordService } from './password.service';
import { TwoFactorService } from './two-factor.service';
import { EmailVerificationService } from './email-verification.service';
import { TurnstileService } from './turnstile.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { Verify2FADto } from '../dto/verify-2fa.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { RefreshTokenDto } from '../dto/refresh.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import type { LoginRequestContext } from './login.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly registrationService: RegistrationService,
    private readonly loginService: LoginService,
    private readonly tokenService: TokenService,
    private readonly passwordService: PasswordService,
    private readonly twoFactorService: TwoFactorService,
    private readonly emailService: EmailVerificationService,
    private readonly turnstileService: TurnstileService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly accessTokenRevocation: AccessTokenRevocationService,
  ) {}

  async register(dto: RegisterDto, ipAddress: string) {
    await this.turnstileService.verifyToken(dto.turnstileToken, ipAddress);
    return this.registrationService.registerUser(dto);
  }

  async login(
    dto: LoginDto,
    ipAddress: string,
    userAgent: string,
    ctx: Partial<LoginRequestContext> = {},
  ) {
    return this.loginService.authenticate(dto, {
      ipAddress,
      userAgent,
      origin: ctx.origin,
      referer: ctx.referer,
      host: ctx.host,
      forwardedHost: ctx.forwardedHost,
    });
  }

  async refresh(dto: RefreshTokenDto, ipAddress: string, userAgent: string) {
    return this.tokenService.refreshToken(dto.refreshToken, ipAddress, userAgent);
  }

  /**
   * Revokes the refresh-token session identified by `dto.refreshToken`.
   * Optional `trustedUserId` comes from an edge proxy (e.g. `x-user-id`) when
   * the caller already proved possession of an access token for that user.
   */
  async logout(dto: RefreshTokenDto, trustedUserId?: string, accessToken?: string) {
    return this.tokenService.revokeRefreshSession(dto.refreshToken, trustedUserId, accessToken);
  }

  async logoutAll(userId: string) {
    return this.tokenService.revokeAllSessionsForUser(userId);
  }

  /**
   * NL-BUG-IMP-3: end the server-side impersonation session from the client tab
   * that holds the support-session access token (does not require admin auth).
   */
  async endOwnImpersonation(input: {
    userId: string;
    isImpersonated?: boolean;
    impersonationSessionId?: string;
    accessJti?: string;
    accessExp?: number;
  }): Promise<{ success: true; sessionId: string }> {
    if (!input.isImpersonated || !input.impersonationSessionId) {
      throw new ForbiddenException('Not an active impersonation session');
    }

    const session = await this.prismaWrite.impersonationSession.findUnique({
      where: { id: input.impersonationSessionId },
    });
    if (!session) {
      throw new NotFoundException('Impersonation session not found');
    }
    if (session.targetUserId !== input.userId) {
      throw new ForbiddenException('Impersonation session does not belong to this user');
    }

    if (!session.endedAt) {
      await this.prismaWrite.impersonationSession.update({
        where: { id: session.id },
        data: { endedAt: new Date() },
      });
    }

    const jti = session.accessJti || input.accessJti;
    if (jti) {
      const expiresAtEpochSec =
        typeof input.accessExp === 'number' && input.accessExp > 0
          ? input.accessExp
          : Math.floor(Date.now() / 1000) + 60 * 60;
      await this.accessTokenRevocation.revokeAccessJti(jti, expiresAtEpochSec).catch(() => undefined);
    }

    return { success: true, sessionId: session.id };
  }

  async verify2FA(dto: Verify2FADto) {
    return this.twoFactorService.verify2FA(
      dto.authSessionId,
      dto.code,
      dto.method,
      dto.rememberMe === true,
    );
  }

  async checkEmail(email: string, turnstileToken: string | undefined, ipAddress: string) {
    await this.turnstileService.verifyToken(turnstileToken, ipAddress);
    // NL-BUG-SEC-003: do not oracle whether an account exists. Format-only check;
    // duplicate emails are rejected at register with a conflict.
    const trimmed = (email ?? '').trim().toLowerCase();
    const formatOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return { valid: formatOk, available: formatOk };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    return this.emailService.verifyEmail(dto.token);
  }

  async resendVerification(dto: ResendVerificationDto) {
    return this.emailService.resendVerification(dto.email);
  }

  async forgotPassword(dto: ForgotPasswordDto, ipAddress: string) {
    await this.turnstileService.verifyToken(dto.turnstileToken, ipAddress);
    return this.passwordService.requestPasswordReset(dto.email);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const nextPassword = dto.newPassword || dto.password;
    if (!nextPassword) {
      throw new BusinessLogicException('A new password is required', 'AUTH_012');
    }
    return this.passwordService.resetPassword(dto.token, nextPassword);
  }
}
