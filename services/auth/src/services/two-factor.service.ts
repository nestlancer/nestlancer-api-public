import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException } from '@nestlancer/common';
import { TokenService } from './token.service';
import { AccountLockoutService } from './account-lockout.service';
import { authenticator } from 'otplib';

type HashedBackupCode = { hash: string; used?: boolean };

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly tokenService: TokenService,
    private readonly lockoutService: AccountLockoutService,
  ) {
    authenticator.options = { window: 1 };
  }

  async verify2FA(
    authSessionId: string,
    code: string,
    method: 'totp' | 'backupCode',
    rememberMe = false,
  ) {
    const session = await this.prismaRead.authSession.findUnique({
      where: { id: authSessionId },
      include: {
        user: {
          include: { authConfig: true },
        },
      },
    });

    if (!session || session.type !== '2FA_PENDING') {
      throw new BusinessLogicException('Authentication session expired or invalid', 'AUTH_009');
    }

    if (session.expiresAt < new Date()) {
      await this.prismaWrite.authSession.delete({ where: { id: authSessionId } });
      throw new BusinessLogicException('Authentication session expired', 'AUTH_009', {
        authSessionId,
        expiredAt: session.expiresAt,
      });
    }

    const { user } = session;

    if (!user.authConfig) {
      throw new BusinessLogicException('Two-factor authentication not configured', 'AUTH_009');
    }

    const normalizedCode = code.trim();

    if (method === 'totp') {
      const isValid = authenticator.verify({
        token: normalizedCode,
        secret: user.authConfig.twoFactorSecret!,
      });

      if (!isValid) {
        const attemptsRemaining = await this.lockoutService.handleFailedAttempt(
          user.id,
          user.authConfig,
        );
        throw new BusinessLogicException('Invalid 2FA code', 'AUTH_005', {
          method: 'totp',
          attemptsRemaining,
        });
      }
    } else if (method === 'backupCode') {
      const nextCodes = this.consumeBackupCode(user.authConfig.backupCodes, normalizedCode);
      if (!nextCodes) {
        const attemptsRemaining = await this.lockoutService.handleFailedAttempt(
          user.id,
          user.authConfig,
        );
        throw new BusinessLogicException('Invalid backup code', 'AUTH_005', {
          method: 'backupCode',
          attemptsRemaining,
        });
      }

      await this.prismaWrite.authConfig.update({
        where: { userId: user.id },
        data: { backupCodes: nextCodes as object[] },
      });
    }

    await this.lockoutService.resetFailedAttempts(user.id);

    // Session successfully verified, delete it
    await this.prismaWrite.authSession.delete({ where: { id: authSessionId } });

    // Generate real tokens — default client portal for 2FA completion (session started on that portal)
    return this.tokenService.generateAuthTokens(
      user,
      rememberMe,
      session.ipAddress ?? undefined,
      session.userAgent ?? undefined,
      'client',
    );
  }

  /**
   * Users service stores `{ hash, used }[]` (SHA-256 of plaintext).
   * Legacy auth tests / older rows may still use plaintext string[].
   * Returns the updated list when a match is consumed, otherwise null.
   */
  private consumeBackupCode(storedRaw: unknown, code: string): unknown[] | null {
    if (!Array.isArray(storedRaw) || storedRaw.length === 0) return null;

    const candidates = Array.from(
      new Set([code, code.toUpperCase(), code.toLowerCase()].filter(Boolean)),
    );

    if (typeof storedRaw[0] === 'string') {
      const plaintext = storedRaw as string[];
      const index = plaintext.findIndex((entry) =>
        candidates.some((c) => entry.trim().toUpperCase() === c.toUpperCase()),
      );
      if (index === -1) return null;
      return plaintext.filter((_, i) => i !== index);
    }

    const hashed = storedRaw as HashedBackupCode[];
    const candidateHashes = candidates.map((c) =>
      createHash('sha256').update(c).digest('hex'),
    );
    const index = hashed.findIndex(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        typeof entry.hash === 'string' &&
        !entry.used &&
        candidateHashes.includes(entry.hash),
    );
    if (index === -1) return null;

    return hashed.map((entry, i) =>
      i === index ? { hash: entry.hash, used: true } : entry,
    );
  }
}
