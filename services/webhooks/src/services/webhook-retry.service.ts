import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebhookRetryService {
  private readonly logger = new Logger(WebhookRetryService.name);
  private readonly maxRetries: number;
  private readonly backoffMultiplier: number;

  constructor(private readonly configService: ConfigService) {
    this.maxRetries = this.configService.get<number>('webhooks.maxRetryAttempts', 5);
    this.backoffMultiplier = this.configService.get<number>('webhooks.retryBackoffMultiplier', 3);
  }

  calculateNextRetry(attempts: number): Date {
    const baseDelayMinutes = 1;
    let delayMinutes = baseDelayMinutes;

    for (let i = 1; i <= attempts; i++) {
      if (i === 1) delayMinutes = 5;
      else if (i === 2) delayMinutes = 30;
      else if (i === 3)
        delayMinutes = 120; // 2 hours
      else delayMinutes = 1440; // 24 hours
    }

    if (attempts === 0) delayMinutes = 1;

    return new Date(Date.now() + delayMinutes * 60 * 1000);
  }

  isMaxRetriesReached(attempts: number): boolean {
    return attempts >= this.maxRetries;
  }
}
