import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { BusinessLogicException, UserStatus, normalizeIp } from '@nestlancer/common';
import { publishAuditEntrySafe } from '@nestlancer/audit';
import { QueuePublisherService } from '@nestlancer/queue';
import { AccountLockoutService } from './account-lockout.service';
import { TokenService } from './token.service';
import { LoginDto } from '../dto/login.dto';
import { resolveLoginPortal, type AuthPortal } from '../utils/portal-binding';
import * as bcrypt from 'bcrypt';

export interface LoginRequestContext {
  ipAddress: string;
  userAgent: string;
  origin?: string;
  referer?: string;
  host?: string;
  forwardedHost?: string;
}

/** Target bcrypt cost for new/rehashed passwords (balance security vs login latency). */
const DEFAULT_BCRYPT_ROUNDS = 10;

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly lockoutService: AccountLockoutService,
    private readonly tokenService: TokenService,
    private readonly queuePublisher: QueuePublisherService,
    private readonly config: ConfigService,
  ) {}

  async authenticate(dto: LoginDto, ctx: LoginRequestContext) {
    const { ipAddress, userAgent } = ctx;
    const portal: AuthPortal = resolveLoginPortal({
      bodyPortal: dto.portal,
      origin: ctx.origin,
      referer: ctx.referer,
      host: ctx.host,
      forwardedHost: ctx.forwardedHost,
    });

    const user = await this.prismaRead.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
      include: { authConfig: true },
    });

    if (!user) {
      await this.lockoutService.recordIpFailure(ipAddress);
      this.publishLoginFailed({
        description: 'Failed sign-in attempt (unknown account)',
        ipAddress,
        userAgent,
        metadata: { reason: 'unknown_account', portal },
      });
      throw new BusinessLogicException('Invalid email or password', 'AUTH_001');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new BusinessLogicException('Account is suspended', 'AUTH_014');
    }

    // Use already-included authConfig — avoids a second AuthConfig round-trip.
    await this.lockoutService.checkLockout(user.id, user.authConfig);

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      await this.lockoutService.recordIpFailure(ipAddress);
      await this.lockoutService.handleFailedAttempt(user.id, user.authConfig);
      this.publishLoginFailed({
        description: 'Failed sign-in attempt (invalid password)',
        ipAddress,
        userAgent,
        userId: user.id,
        metadata: { reason: 'invalid_password', portal },
      });
      throw new BusinessLogicException('Invalid email or password', 'AUTH_001');
    }

    if (!user.emailVerified) {
      throw new BusinessLogicException('Email address not verified', 'AUTH_002', {
        email: user.email,
      });
    }

    if (user.authConfig?.mustChangePassword === true) {
      throw new BusinessLogicException(
        'Password change required before you can sign in',
        'AUTH_PASSWORD_CHANGE_REQUIRED',
      );
    }

    const role = String(user.role ?? '').toUpperCase();
    if (portal === 'client' && role === 'ADMIN') {
      this.publishLoginFailed({
        description: 'Failed sign-in attempt (wrong portal)',
        ipAddress,
        userAgent,
        userId: user.id,
        metadata: { reason: 'portal_mismatch', portal, role },
      });
      throw new BusinessLogicException(
        'Admin accounts must sign in on the admin app',
        'AUTH_PORTAL_MISMATCH',
      );
    }
    if (portal === 'admin' && role !== 'ADMIN') {
      this.publishLoginFailed({
        description: 'Failed sign-in attempt (wrong portal)',
        ipAddress,
        userAgent,
        userId: user.id,
        metadata: { reason: 'portal_mismatch', portal, role },
      });
      throw new BusinessLogicException(
        'This portal is for operators only. Use the client app to sign in.',
        'AUTH_PORTAL_MISMATCH',
      );
    }

    this.lockoutService.clearIpFailures(ipAddress);

    if (user.authConfig?.twoFactorEnabled) {
      await this.lockoutService.resetFailedAttempts(user.id);
      const authSessionId = `sess2Fa_${Math.random().toString(36).substr(2, 9)}`;

      await this.prismaWrite.authSession.create({
        data: {
          id: authSessionId,
          userId: user.id,
          ipAddress,
          userAgent,
          type: '2FA_PENDING',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
        },
      });

      return {
        requires2FA: true,
        authSessionId,
        methodsAvailable: ['totp', 'backupCode'],
      };
    }

    // Reset lockout counters in parallel with session/token creation.
    const [, tokens] = await Promise.all([
      this.lockoutService.resetFailedAttempts(user.id),
      this.tokenService.generateAuthTokens(
        user,
        dto.rememberMe,
        ipAddress,
        userAgent,
        portal,
      ),
    ]);

    // Lazy rehash high-cost hashes off the response path (cost-12 → target rounds).
    void this.maybeRehashPassword(user.id, user.passwordHash, dto.password);

    publishAuditEntrySafe(
      this.queuePublisher,
      {
        action: 'LOGIN',
        category: 'auth',
        description: 'User signed in successfully',
        userId: user.id,
        resourceType: 'Session',
        resourceId: user.id,
        ip: normalizeIp(ipAddress) ?? undefined,
        userAgent: userAgent?.trim() || undefined,
      },
      this.logger,
    );

    return tokens;
  }

  /** Persist every failed sign-in path claimed by the admin gate (NL-BUG-OPS-001). */
  private publishLoginFailed(input: {
    description: string;
    ipAddress: string;
    userAgent: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): void {
    publishAuditEntrySafe(
      this.queuePublisher,
      {
        action: 'LOGIN_FAILED',
        category: 'auth',
        description: input.description,
        userId: input.userId,
        resourceType: 'User',
        resourceId: input.userId,
        ip: normalizeIp(input.ipAddress) ?? undefined,
        userAgent: input.userAgent?.trim() || undefined,
        metadata: input.metadata,
      },
      this.logger,
    );
  }

  /** Parse bcrypt cost from `$2a$12$...` / `$2b$10$...`. */
  private bcryptCost(hash: string): number | null {
    const m = /^\$2[aby]?\$(\d{2})\$/.exec(hash);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }

  private targetBcryptRounds(): number {
    return (
      this.config.get<number>('authService.security.bcryptSaltRounds') || DEFAULT_BCRYPT_ROUNDS
    );
  }

  /**
   * After a successful login, downgrade over-costed hashes to the configured
   * rounds so subsequent compares stay fast under container CPU caps.
   */
  private async maybeRehashPassword(
    userId: string,
    currentHash: string,
    plainPassword: string,
  ): Promise<void> {
    try {
      const target = this.targetBcryptRounds();
      const cost = this.bcryptCost(currentHash);
      if (cost == null || cost <= target) return;

      const nextHash = await bcrypt.hash(plainPassword, target);
      await this.prismaWrite.user.update({
        where: { id: userId },
        data: { passwordHash: nextHash },
      });
      this.logger.log(`Rehashed password for user ${userId} from cost ${cost} to ${target}`);
    } catch (error: unknown) {
      this.logger.warn(
        `Password rehash skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
