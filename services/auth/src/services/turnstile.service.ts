import { Injectable } from '@nestjs/common';
import { NestlancerConfigService as ConfigService } from '@nestlancer/config';
import { LoggerService } from '@nestlancer/logger';
import { BusinessLogicException } from '@nestlancer/common';

/**
 * Cloudflare Turnstile verification for auth.
 *
 * Enablement is driven by Infisical / env:
 * - `TURNSTILE_SECRET_KEY` set → enforce bot check (optional `TURNSTILE_BYPASS_TOKEN` for seed/e2e)
 * - `TURNSTILE_SECRET_KEY` empty/missing → disabled; requests succeed without a token
 */
@Injectable()
export class TurnstileService {
  private readonly secretKey: string;
  private readonly bypassToken: string;
  private readonly verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.secretKey = (
      this.configService.getOptional<string>('authService.turnstile.secretKey') ?? ''
    ).trim();
    this.bypassToken = (
      this.configService.getOptional<string>('authService.turnstile.bypassToken') ?? ''
    ).trim();

    if (!this.isEnabled()) {
      this.logger.warn(
        'Turnstile disabled (TURNSTILE_SECRET_KEY unset) — auth bot check is off',
        'TurnstileService',
      );
    }
  }

  /** True when a Cloudflare secret is configured in the environment. */
  isEnabled(): boolean {
    return this.secretKey.length > 0;
  }

  async verifyToken(token: string | undefined | null, ipAddress?: string): Promise<boolean> {
    if (!this.isEnabled()) {
      return true;
    }

    const trimmed = (token ?? '').trim();
    if (!trimmed) {
      throw new BusinessLogicException('Turnstile token required', 'AUTH_011');
    }

    if (this.bypassToken && trimmed === this.bypassToken) {
      return true;
    }

    if (process.env.NODE_ENV === 'test') {
      return true;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', this.secretKey);
      formData.append('response', trimmed);
      if (ipAddress) {
        formData.append('remoteip', ipAddress);
      }

      const response = await fetch(this.verifyUrl, {
        method: 'POST',
        body: formData as any,
      });

      const data = (await response.json()) as { success: boolean; 'error-codes'?: string[] };

      if (!data.success) {
        this.logger.warn(
          `Turnstile verification failed: ${JSON.stringify(data['error-codes'])}`,
          'TurnstileService',
        );
        throw new BusinessLogicException('Turnstile verification failed', 'AUTH_011');
      }

      return true;
    } catch (error: any) {
      if (error instanceof BusinessLogicException) throw error;

      this.logger.error('Error verifying turnstile token', error.stack, 'TurnstileService');
      throw new BusinessLogicException('Turnstile verification failed', 'AUTH_011');
    }
  }
}
