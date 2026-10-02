import { Injectable, Logger } from '@nestjs/common';
import { NestlancerConfigService as ConfigService } from '@nestlancer/config';
import {
  PrismaWriteService,
  PrismaReadService,
} from '@nestlancer/database';
import { BusinessLogicException, generateUuid, normalizeIp, parseUserAgent } from '@nestlancer/common';
import { AccessTokenRevocationService } from '@nestlancer/cache';
import { publishAuditEntrySafe } from '@nestlancer/audit';
import { QueuePublisherService } from '@nestlancer/queue';
import { JwtPayload } from '@nestlancer/auth-lib';
import * as jwt from 'jsonwebtoken';

/**
 * Multi-line PEM keys stored in .env files appear as one long line containing
 * literal `\n` escape sequences. Node's dotenv loader doesn't unescape them, so
 * jsonwebtoken rejects them as "not an asymmetric key". Run every PEM through
 * this helper at the point of use to be safe.
 */
function normalizePem(value: string | undefined): string {
  return (value ?? '').replace(/\\n/g, '\n');
}

function signJwt(payload: object, secret: jwt.Secret, options: jwt.SignOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(payload, secret, options, (err, encoded) => {
      if (err || !encoded) {
        reject(err ?? new Error('JWT sign returned an empty token'));
        return;
      }
      resolve(encoded);
    });
  });
}

function verifyJwt(
  token: string,
  publicKey: jwt.Secret,
  options: jwt.VerifyOptions,
): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, publicKey, options, (err, decoded) => {
      if (err || !decoded || typeof decoded === 'string') {
        reject(err ?? new Error('JWT verify returned a non-object payload'));
        return;
      }
      resolve(decoded as jwt.JwtPayload);
    });
  });
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly queuePublisher: QueuePublisherService,
    private readonly accessTokenRevocation: AccessTokenRevocationService,
  ) {}

  /** Nest feature config or flat env (e2e / standalone auth service). */
  private jwtSetting<T extends string | number>(path: string, envKey: string, fallback: T): T {
    const fromFeature = this.configService.getOptional<T>(`authService.jwt.${path}`);
    if (fromFeature !== undefined) return fromFeature;
    const fromEnv = process.env[envKey];
    if (fromEnv === undefined || fromEnv === '') return fallback;
    return (typeof fallback === 'number' ? parseInt(fromEnv, 10) : fromEnv) as T;
  }

  private refreshTokenAudiences(): string[] {
    return [
      this.jwtSetting('audience', 'JWT_AUDIENCE', 'nestlancer-api'),
      this.jwtSetting('clientAudience', 'JWT_CLIENT_AUDIENCE', 'nestlancer-client'),
      this.jwtSetting('adminAudience', 'JWT_ADMIN_AUDIENCE', 'nestlancer-admin'),
    ];
  }

  private verifyRefreshJwt(token: string): Promise<jwt.JwtPayload> {
    return verifyJwt(
      token,
      normalizePem(this.jwtSetting('refreshPublicKey', 'JWT_REFRESH_PUBLIC_KEY', '')),
      {
        algorithms: ['RS256'],
        issuer: this.jwtSetting('issuer', 'JWT_ISSUER', 'nestlancer-auth'),
        audience: this.refreshTokenAudiences() as jwt.VerifyOptions['audience'],
      },
    );
  }

  private refreshJtiExpiryEpochSec(payload: jwt.JwtPayload): number {
    if (typeof payload.exp === 'number') return payload.exp;
    const refreshExpiresIn = this.jwtSetting('refreshExpiresIn', 'JWT_REFRESH_EXPIRES_IN', 604800);
    return Math.floor(Date.now() / 1000) + refreshExpiresIn;
  }

  async generateAuthTokens(
    user: any,
    rememberMe: boolean = false,
    ipAddress?: string,
    userAgent?: string,
    portal: 'client' | 'admin' = 'client',
    options?: { skipSessionHousekeeping?: boolean },
  ) {
    const accessExpiresIn = this.jwtSetting('accessExpiresIn', 'JWT_ACCESS_EXPIRES_IN', 900);
    const refreshExpiresIn = rememberMe
      ? 30 * 24 * 60 * 60 // 30 days
      : this.jwtSetting('refreshExpiresIn', 'JWT_REFRESH_EXPIRES_IN', 604800);

    const accessJti = generateUuid();
    const refreshJti = generateUuid();

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      jti: accessJti,
      portal,
    };

    const refreshPayload = {
      sub: user.id,
      type: 'refresh',
      jti: refreshJti,
      portal,
    };

    const accessPrivateKey = normalizePem(
      this.jwtSetting('accessPrivateKey', 'JWT_ACCESS_PRIVATE_KEY', ''),
    );
    const refreshPrivateKey = normalizePem(
      this.jwtSetting('refreshPrivateKey', 'JWT_REFRESH_PRIVATE_KEY', ''),
    );
    const issuer = this.jwtSetting('issuer', 'JWT_ISSUER', 'nestlancer-auth');
    // Portal-specific audience binds tokens to client vs admin apps (H1).
    // Legacy `nestlancer-api` remains accepted on verify for rolling refresh.
    const audience =
      portal === 'admin'
        ? this.jwtSetting('adminAudience', 'JWT_ADMIN_AUDIENCE', 'nestlancer-admin')
        : this.jwtSetting('clientAudience', 'JWT_CLIENT_AUDIENCE', 'nestlancer-client');

    const [accessToken, refreshToken] = await Promise.all([
      signJwt(accessPayload, accessPrivateKey, {
        algorithm: 'RS256',
        expiresIn: accessExpiresIn,
        issuer,
        audience,
      }),
      signJwt(refreshPayload, refreshPrivateKey, {
        algorithm: 'RS256',
        expiresIn: refreshExpiresIn,
        issuer,
        audience,
      }),
    ]);

    // Track the active refresh token in the Session table.
    // We store the refresh JTI in the unique `token` column so we can match it
    // on refresh and treat its absence as a revoked/expired session.
    // Login runs full prune/dedupe/limit; refresh already deleted the old row —
    // skip housekeeping so rotation stays on the critical path.
    if (!options?.skipSessionHousekeeping) {
      await Promise.all([
        this.pruneStaleSessions(user.id),
        this.dedupeSameDeviceSessions(user.id, ipAddress, userAgent),
      ]);
      await this.enforceSessionLimit(user.id);
    }

    await this.prismaWrite.session.create({
      data: {
        userId: user.id,
        token: refreshJti,
        ip: normalizeIp(ipAddress) ?? null,
        userAgent: userAgent || null,
        deviceInfo: {
          ...parseUserAgent(userAgent),
          ...(rememberMe ? { rememberMe: true } : {}),
          portal,
          lastAccessJti: accessJti,
          lastAccessExp: Math.floor(Date.now() / 1000) + accessExpiresIn,
        },
        expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone ?? undefined,
        role: user.role,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.authConfig?.twoFactorEnabled ?? false,
      },
    };
  }

  /**
   * Concurrent legitimate refreshes (two tabs, 15-min access TTL) must not be
   * treated as token theft. The winner stores successor tokens for a few seconds;
   * losers of the same jti receive that same pair instead of killing the family.
   */
  private async readRotationGrace(jti: string | undefined) {
    if (!jti) return null;
    try {
      return await this.accessTokenRevocation.getRefreshRotationGrace(jti);
    } catch (error: unknown) {
      this.logger.warn(
        `Refresh grace lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private async waitForRotationGrace(jti: string) {
    // Concurrent tabs share grace tokens. Cover p99 rotation (often 200–800ms+).
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const grace = await this.readRotationGrace(jti);
      if (grace) return grace;
    }
    return null;
  }

  async refreshToken(token: string, ipAddress: string, userAgent: string) {
    try {
      const payload = await this.verifyRefreshJwt(token);

      if (payload.type !== 'refresh') {
        throw new BusinessLogicException('Invalid token type', 'AUTH_004');
      }

      const refreshJti = payload.jti as string | undefined;
      const userId = payload.sub as string;

      let lockHeld = false;
      if (refreshJti) {
        try {
          lockHeld = await this.accessTokenRevocation.tryAcquireRefreshRotationLock(refreshJti);
        } catch (error: unknown) {
          this.logger.warn(
            `Refresh lock unavailable: ${error instanceof Error ? error.message : String(error)}`,
          );
          throw new BusinessLogicException(
            'Refresh temporarily unavailable; retry shortly',
            'AUTH_REFRESH_BUSY',
            { reason: 'refreshLockUnavailable', retryAfter: 2 },
          );
        }
        if (!lockHeld) {
          const waited = await this.waitForRotationGrace(refreshJti);
          if (waited) return waited;
          // Transient — do NOT use AUTH_004 (401): BFF would clear HttpOnly cookies.
          throw new BusinessLogicException(
            'Refresh already in progress; retry shortly',
            'AUTH_REFRESH_BUSY',
            { reason: 'refreshInFlight', retryAfter: 2 },
          );
        }
      }

      try {
      // Primary DB read — replica lag can leave a rotated session visible (NL-AUTH-004).
      const session = await this.prismaWrite.session.findFirst({
        where: {
          userId,
          token: refreshJti,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        // Late concurrent tab after winner released the lock: prefer grace over theft.
        const lateGrace = await this.readRotationGrace(refreshJti);
        if (lateGrace) return lateGrace;

        if (await this.accessTokenRevocation.isRefreshTokenRevoked(refreshJti)) {
          await this.revokeAllSessionsForUser(userId);
          throw new BusinessLogicException('Refresh token reuse detected', 'AUTH_004', {
            reason: 'refreshReuse',
          });
        }

        throw new BusinessLogicException('Session expired or revoked', 'AUTH_004', {
          reason: 'sessionRevoked',
        });
      }

      const user = await this.prismaRead.user.findUnique({
        where: { id: payload.sub },
        include: { authConfig: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new BusinessLogicException('User account not active', 'AUTH_004');
      }

      if (user.authConfig?.mustChangePassword === true) {
        throw new BusinessLogicException(
          'Password change required before you can refresh your session',
          'AUTH_PASSWORD_CHANGE_REQUIRED',
        );
      }

      // Revoke old jti + delete session in parallel (reuse detection still uses denylist).
      if (refreshJti) {
        await Promise.all([
          this.accessTokenRevocation.revokeRefreshJti(
            refreshJti,
            this.refreshJtiExpiryEpochSec(payload),
          ),
          this.prismaWrite.session.delete({ where: { id: session.id } }),
        ]);
      } else {
        await this.prismaWrite.session.delete({ where: { id: session.id } });
      }

      const deviceInfo =
        session.deviceInfo != null &&
        typeof session.deviceInfo === 'object' &&
        !Array.isArray(session.deviceInfo)
          ? (session.deviceInfo as { rememberMe?: boolean; portal?: 'client' | 'admin' })
          : {};

      const rememberMe = deviceInfo.rememberMe === true;
      const portal =
        deviceInfo.portal === 'admin' ||
        (payload as { portal?: string }).portal === 'admin'
          ? 'admin'
          : 'client';

      const result = await this.generateAuthTokens(
        user,
        rememberMe,
        ipAddress,
        userAgent,
        portal,
        { skipSessionHousekeeping: true },
      );

      const tokens = {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        tokenType: result.tokenType,
      };

      if (refreshJti) {
        try {
          await this.accessTokenRevocation.setRefreshRotationGrace(refreshJti, tokens);
        } catch (error: unknown) {
          this.logger.warn(
            `Refresh grace store failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      return tokens;
      } finally {
        if (lockHeld && refreshJti) {
          try {
            await this.accessTokenRevocation.releaseRefreshRotationLock(refreshJti);
          } catch (error: unknown) {
            this.logger.warn(
              `Refresh lock release failed: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }
    } catch (error: any) {
      if (error instanceof BusinessLogicException) throw error;
      throw new BusinessLogicException('Invalid or expired refresh token', 'AUTH_004', {
        reason: 'tokenExpired',
      });
    }
  }

  /**
   * Revokes a single refresh-token session (current device). Idempotent if the
   * session was already removed (e.g. after refresh rotation).
   *
   * When `expectedSubFromTrustedProxy` is set (e.g. gateway `x-user-id`), the
   * refresh token's subject must match — prevents revoking another user's session
   * if a client sends a mismatched pair of headers and body.
   */
  async revokeRefreshSession(
    refreshToken: string,
    expectedSubFromTrustedProxy?: string,
    accessToken?: string,
  ): Promise<{ revoked: boolean }> {
    try {
      const payload = await this.verifyRefreshJwt(refreshToken);

      if (payload.type !== 'refresh') {
        throw new BusinessLogicException('Invalid token type', 'AUTH_004');
      }

      const sub = payload.sub as string;
      const jti = payload.jti as string;

      if (expectedSubFromTrustedProxy && expectedSubFromTrustedProxy !== sub) {
        throw new BusinessLogicException(
          'Refresh token does not match authenticated user',
          'AUTH_015',
        );
      }

      const session = await this.prismaWrite.session.findFirst({
        where: {
          userId: sub,
          token: jti,
          expiresAt: { gt: new Date() },
        },
      });

      if (session) {
        await this.accessTokenRevocation.revokeRefreshJti(
          jti,
          this.refreshJtiExpiryEpochSec(payload),
        );
        await this.revokeStoredAccessJti(session.deviceInfo);
        await this.prismaWrite.session.delete({
          where: { id: session.id },
        });
        publishAuditEntrySafe(
          this.queuePublisher,
          {
            action: 'LOGOUT',
            category: 'auth',
            description: 'User signed out',
            userId: sub,
            resourceType: 'Session',
            resourceId: session.id,
          },
          this.logger,
        );
      }

      await this.revokeAccessTokenIfPresent(accessToken);

      return { revoked: true };
    } catch (error: unknown) {
      if (error instanceof BusinessLogicException) throw error;
      throw new BusinessLogicException('Invalid or expired refresh token', 'AUTH_004', {
        reason: 'tokenExpired',
      });
    }
  }

  /** Deletes every persisted session for the user (all devices). */
  async revokeAllSessionsForUser(userId: string): Promise<{ revokedCount: number }> {
    const result = await this.prismaWrite.session.deleteMany({
      where: { userId },
    });
    await this.accessTokenRevocation.markUserLoggedOutEverywhere(userId);
    return { revokedCount: result.count };
  }

  /** Remove expired rows so they do not inflate active-session counts. */
  private async pruneStaleSessions(userId: string): Promise<void> {
    await this.prismaWrite.session.deleteMany({
      where: {
        userId,
        expiresAt: { lte: new Date() },
      },
    });
  }

  /**
   * Cap concurrent refresh-token sessions per user. Drops oldest sessions when
   * auditors or repeated logins exceed the limit (NL-AUTH-003).
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    const maxActive =
      this.configService.getOptional<number>('authService.security.maxActiveSessions') ??
      Number(process.env.AUTH_MAX_ACTIVE_SESSIONS || 8);

    const active = await this.prismaRead.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'asc' },
      select: { id: true },
    });

    const excess = active.length - maxActive + 1;
    if (excess <= 0) return;

    const toRemove = active.slice(0, excess).map((s) => s.id);
    await this.prismaWrite.session.deleteMany({
      where: { id: { in: toRemove } },
    });
  }

  /** Drop older sessions from the same IP + user-agent before creating a new one. */
  private async dedupeSameDeviceSessions(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const ip = normalizeIp(ipAddress);
    const ua = userAgent?.trim();
    if (!ip && !ua) return;

    const sessions = await this.prismaRead.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        ...(ip ? { ip } : {}),
        ...(ua ? { userAgent: ua } : {}),
      },
      orderBy: { lastActiveAt: 'desc' },
      select: { id: true },
    });

    if (sessions.length <= 1) return;

    await this.prismaWrite.session.deleteMany({
      where: { id: { in: sessions.slice(1).map((s) => s.id) } },
    });
  }

  private async revokeStoredAccessJti(deviceInfo: unknown): Promise<void> {
    if (!deviceInfo || typeof deviceInfo !== 'object' || Array.isArray(deviceInfo)) return;
    const info = deviceInfo as { lastAccessJti?: string; lastAccessExp?: number };
    if (!info.lastAccessJti) return;
    const exp =
      typeof info.lastAccessExp === 'number'
        ? info.lastAccessExp
        : Math.floor(Date.now() / 1000) +
          this.jwtSetting('accessExpiresIn', 'JWT_ACCESS_EXPIRES_IN', 900);
    await this.accessTokenRevocation.revokeAccessJti(info.lastAccessJti, exp);
  }

  private async revokeAccessTokenIfPresent(accessToken?: string): Promise<void> {
    if (!accessToken?.trim()) return;

    const token = accessToken.startsWith('Bearer ') ? accessToken.slice(7).trim() : accessToken.trim();
    if (!token) return;

    const payload = jwt.decode(token) as JwtPayload | null;
    if (!payload || payload.type !== 'access' || !payload.jti) return;

    const exp =
      typeof payload.exp === 'number'
        ? payload.exp
        : Math.floor(Date.now() / 1000) +
          this.jwtSetting('accessExpiresIn', 'JWT_ACCESS_EXPIRES_IN', 900);

    await this.accessTokenRevocation.revokeAccessJti(payload.jti, exp);
  }
}
