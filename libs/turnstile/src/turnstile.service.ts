import { Injectable, Inject, Logger } from '@nestjs/common';
import { TurnstileResult } from './interfaces/turnstile.interface';

type TurnstileOptions = {
  secretKey?: string;
  siteKey?: string;
  bypassToken?: string;
};

/**
 * Shared Turnstile verifier (contact, etc.).
 *
 * Disabled when `TURNSTILE_SECRET_KEY` (or injected secretKey) is empty —
 * so removing the key from Infisical turns bot protection off without code changes.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(@Inject('TURNSTILE_OPTIONS') private readonly options: TurnstileOptions) {}

  isEnabled(): boolean {
    const secretKey = (this.options.secretKey || process.env.TURNSTILE_SECRET_KEY || '').trim();
    return secretKey.length > 0;
  }

  async verify(token: string | undefined | null, remoteIp?: string): Promise<TurnstileResult> {
    if (!this.isEnabled()) {
      return { success: true };
    }

    const secretKey = (this.options.secretKey || process.env.TURNSTILE_SECRET_KEY || '').trim();
    const bypassToken =
      this.options.bypassToken?.trim() || process.env.TURNSTILE_BYPASS_TOKEN?.trim() || '';

    const trimmed = (token ?? '').trim();
    if (!trimmed) {
      return { success: false, errorCodes: ['missing-input-response'] };
    }

    if (bypassToken && trimmed === bypassToken) {
      return { success: true };
    }

    if (process.env.NODE_ENV === 'test') return { success: true };

    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: secretKey,
          response: trimmed,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
      });
      const data = (await response.json()) as TurnstileResult & { 'error-codes'?: string[] };
      if (Array.isArray(data['error-codes']) && !data.errorCodes) {
        data.errorCodes = data['error-codes'];
      }
      return data;
    } catch (error) {
      this.logger.error('Turnstile verification failed:', error);
      return { success: false, errorCodes: ['VERIFICATION_FAILED'] };
    }
  }
}
