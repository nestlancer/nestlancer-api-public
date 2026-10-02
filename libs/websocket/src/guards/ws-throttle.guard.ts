import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { isRateLimitEnabled, parseEnvPositiveInt } from '@nestlancer/common';

/**
 * WebSocket message throttle — env-driven via RATE_LIMIT_ENABLED / WS_RATE_LIMIT_*.
 */
@Injectable()
export class WsThrottleGuard implements CanActivate {
  private readonly limits = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    if (!isRateLimitEnabled()) {
      return true;
    }
    const max = parseEnvPositiveInt(process.env.WS_RATE_LIMIT_MAX, 60);
    const windowMs = parseEnvPositiveInt(process.env.WS_RATE_LIMIT_WINDOW_MS, 60_000);
    const client = context.switchToWs().getClient();
    const key = client.id;
    const now = Date.now();
    const record = this.limits.get(key);
    if (!record || now > record.resetAt) {
      this.limits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (record.count >= max) return false;
    record.count++;
    return true;
  }
}
