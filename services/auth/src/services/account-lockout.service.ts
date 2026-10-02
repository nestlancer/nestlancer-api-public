import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import {
  RateLimitException,
  isRateLimitEnabled,
  parseEnvPositiveInt,
} from '@nestlancer/common';
import { NestlancerConfigService as ConfigService } from '@nestlancer/config';

/**
 * Per-account lockout plus IP-scoped failed-login rate limiting so
 * unknown-email bursts also receive HTTP 429 instead of only AUTH_001 forever.
 *
 * Master switch: `RATE_LIMIT_ENABLED` (same as gateway ThrottleGuard).
 * All numeric knobs come from env — never hardcode production limits here.
 */
@Injectable()
export class AccountLockoutService {
  /** In-process IP fail counters (augmented by gateway throttle). */
  private readonly ipFailures = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly config: ConfigService,
  ) {}

  private ipWindowMs(): number {
    // Prefer AUTH_IP_FAIL_WINDOW_MS — do NOT reuse FAILED_LOGIN_COOLDOWN_WINDOW_MS
    // (often 1h) which made seed retries look stuck for an hour.
    return parseEnvPositiveInt(
      process.env.AUTH_IP_FAIL_WINDOW_MS,
      this.config.get<number>('authService.security.failedLoginCooldownWindowMs') || 60_000,
    );
  }

  private ipMaxFails(): number {
    // Infisical uses high sentinels (e.g. 10000) to effectively disable IP fail throttling.
    // parseEnvPositiveInt strips Infisical quotes so "'10000'" does not fall back to 5.
    return parseEnvPositiveInt(process.env.AUTH_IP_FAIL_LIMIT, 5);
  }

  private throwAccountLocked(lockoutUntil: Date): never {
    const retryAfter = Math.max(1, Math.ceil((lockoutUntil.getTime() - Date.now()) / 1000));
    throw new RateLimitException(retryAfter);
  }

  /** Call on unknown-email or wrong-password attempts. Throws HTTP 429 when the IP is hot. */
  async recordIpFailure(ipAddress: string): Promise<void> {
    if (!isRateLimitEnabled()) {
      return;
    }
    const ip = (ipAddress || 'unknown').trim() || 'unknown';
    const now = Date.now();
    const windowMs = this.ipWindowMs();
    const max = this.ipMaxFails();
    const record = this.ipFailures.get(ip);

    if (!record || now > record.resetAt) {
      this.ipFailures.set(ip, { count: 1, resetAt: now + windowMs });
      if (1 >= max) {
        throw new RateLimitException(Math.ceil(windowMs / 1000));
      }
      return;
    }

    record.count += 1;
    if (record.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
      throw new RateLimitException(retryAfter);
    }
  }

  clearIpFailures(ipAddress: string): void {
    const ip = (ipAddress || 'unknown').trim() || 'unknown';
    this.ipFailures.delete(ip);
  }

  async checkLockout(
    userId: string,
    authConfig?: { lockoutUntil?: Date | null } | null,
  ): Promise<void> {
    if (!isRateLimitEnabled()) {
      return;
    }
    const config =
      authConfig !== undefined
        ? authConfig
        : await this.prismaRead.authConfig.findUnique({
            where: { userId },
          });

    if (config?.lockoutUntil && config.lockoutUntil > new Date()) {
      this.throwAccountLocked(config.lockoutUntil);
    }
  }

  async handleFailedAttempt(userId: string, authConfig: any): Promise<number> {
    const maxAttempts =
      parseEnvPositiveInt(
        process.env.MAX_FAILED_LOGIN_ATTEMPTS,
        this.config.get<number>('authService.security.maxFailedAttempts') || 5,
      );
    const lockoutDurationMs =
      parseEnvPositiveInt(
        process.env.LOCKOUT_DURATION_MS,
        this.config.get<number>('authService.security.lockoutDurationMs') || 1_800_000,
      );

    if (!isRateLimitEnabled()) {
      // Still count failures for audit, but never lock the account while limits are off.
      const currentAttempts = (authConfig?.failedLoginAttempts || 0) + 1;
      await this.prismaWrite.authConfig.upsert({
        where: { userId },
        update: {
          failedLoginAttempts: currentAttempts,
          lockoutUntil: null,
        },
        create: {
          userId,
          failedLoginAttempts: currentAttempts,
          lockoutUntil: null,
        },
      });
      return Math.max(0, maxAttempts - currentAttempts);
    }

    if (authConfig?.lockoutUntil && authConfig.lockoutUntil > new Date()) {
      return 0;
    }

    const currentAttempts = (authConfig?.failedLoginAttempts || 0) + 1;
    let lockoutUntil: Date | null = null;

    if (currentAttempts >= maxAttempts) {
      lockoutUntil = new Date(Date.now() + lockoutDurationMs);
    }

    await this.prismaWrite.authConfig.upsert({
      where: { userId },
      update: {
        failedLoginAttempts: currentAttempts,
        lockoutUntil,
      },
      create: {
        userId,
        failedLoginAttempts: currentAttempts,
        lockoutUntil,
      },
    });

    if (lockoutUntil) {
      this.throwAccountLocked(lockoutUntil);
    }

    return Math.max(0, maxAttempts - currentAttempts);
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await this.prismaWrite.authConfig.updateMany({
      where: { userId, failedLoginAttempts: { gt: 0 } },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    });
  }
}
