import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

/** Thrown when rate limit is exceeded */
export class RateLimitException extends BaseAppException {
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super(
      ERROR_CODES.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      HttpStatus.TOO_MANY_REQUESTS,
      [{ retryAfter }],
    );
    this.retryAfter = retryAfter;
  }
}
