import { Injectable } from '@nestjs/common';

import { CacheService } from './cache.service';

const REVOKED_JTI_PREFIX = 'auth:revoked-jti:';
const REVOKED_REFRESH_JTI_PREFIX = 'auth:revoked-refresh-jti:';
const LOGOUT_ALL_PREFIX = 'auth:logout-all-at:';
const REFRESH_GRACE_PREFIX = 'auth:refresh-grace:';
const REFRESH_LOCK_PREFIX = 'auth:refresh-lock:';

/** Successor tokens issued when a refresh jti was rotated (short reuse window). */
export type RefreshRotationGrace = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
};

/** Redis-backed JWT denylist (gateway access checks + auth logout/rotation). */
@Injectable()
export class AccessTokenRevocationService {
  constructor(private readonly cache: CacheService) {}

  async revokeAccessJti(jti: string, expiresAtEpochSec: number): Promise<void> {
    const ttl = Math.max(1, expiresAtEpochSec - Math.floor(Date.now() / 1000));
    await this.cache.set(`${REVOKED_JTI_PREFIX}${jti}`, true, ttl);
  }

  async revokeRefreshJti(jti: string, expiresAtEpochSec: number): Promise<void> {
    const ttl = Math.max(1, expiresAtEpochSec - Math.floor(Date.now() / 1000));
    await this.cache.set(`${REVOKED_REFRESH_JTI_PREFIX}${jti}`, true, ttl);
  }

  async isRefreshTokenRevoked(jti: string | undefined): Promise<boolean> {
    if (!jti) return false;
    const revoked = await this.cache.get<boolean>(`${REVOKED_REFRESH_JTI_PREFIX}${jti}`);
    return Boolean(revoked);
  }

  /**
   * NL-BUG-AUTH-001: concurrent tabs that refresh the same cookie within this
   * window reuse the successor tokens instead of being treated as theft.
   */
  async getRefreshRotationGrace(jti: string): Promise<RefreshRotationGrace | null> {
    return this.cache.get<RefreshRotationGrace>(`${REFRESH_GRACE_PREFIX}${jti}`);
  }

  /**
   * Grace must outlast p99 concurrent refresh latency (and any BFF retry).
   * A 10s window was shorter than real refresh storms and caused AUTH_004 / cookie wipes.
   */
  async setRefreshRotationGrace(jti: string, tokens: RefreshRotationGrace, ttlSeconds = 60): Promise<void> {
    await this.cache.set(`${REFRESH_GRACE_PREFIX}${jti}`, tokens, ttlSeconds);
  }

  async tryAcquireRefreshRotationLock(jti: string, ttlSeconds = 15): Promise<boolean> {
    return this.cache.setIfAbsent(`${REFRESH_LOCK_PREFIX}${jti}`, true, ttlSeconds);
  }

  async releaseRefreshRotationLock(jti: string): Promise<void> {
    await this.cache.del(`${REFRESH_LOCK_PREFIX}${jti}`);
  }

  async markUserLoggedOutEverywhere(
    userId: string,
    maxSessionTtlSec = 30 * 24 * 60 * 60,
  ): Promise<void> {
    await this.cache.set(`${LOGOUT_ALL_PREFIX}${userId}`, Date.now(), maxSessionTtlSec);
  }

  async isAccessTokenRevoked(
    userId: string,
    jti: string | undefined,
    issuedAtEpochSec: number,
  ): Promise<boolean> {
    if (jti) {
      const revoked = await this.cache.get<boolean>(`${REVOKED_JTI_PREFIX}${jti}`);
      if (revoked) return true;
    }

    const logoutAt = await this.cache.get<number>(`${LOGOUT_ALL_PREFIX}${userId}`);
    if (logoutAt && issuedAtEpochSec * 1000 < logoutAt) {
      return true;
    }

    return false;
  }
}
