import { HttpStatus } from '@nestjs/common';
import { RateLimitException } from '../../../src/exceptions/rate-limit.exception';
import { ERROR_CODES } from '../../../src/constants/error-codes.constants';

describe('RateLimitException', () => {
  it('should format message with retryAfter seconds', () => {
    const retryAfter = 60;

    const exception = new RateLimitException(retryAfter);

    expect(exception).toBeInstanceOf(RateLimitException);
    expect(exception.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
    expect(exception.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);

    const response = exception.getResponse() as any;
    expect(response.error.message).toBe('Rate limit exceeded. Retry after 60 seconds');
  });
});
