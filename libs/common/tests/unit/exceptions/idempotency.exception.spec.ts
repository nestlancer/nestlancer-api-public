import { HttpStatus } from '@nestjs/common';
import { IdempotencyConflictException } from '../../../src/exceptions/idempotency.exception';
import { ERROR_CODES } from '../../../src/constants/error-codes.constants';

describe('IdempotencyConflictException', () => {
  it('should use default message if none is provided', () => {
    const exception = new IdempotencyConflictException();

    expect(exception).toBeInstanceOf(IdempotencyConflictException);
    expect(exception.code).toBe(ERROR_CODES.IDEMPOTENCY_CONFLICT);
    expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);

    const response = exception.getResponse() as any;
    expect(response.error.message).toBe(
      'Request with this idempotency key is already being processed',
    );
  });

  it('should use custom message if provided', () => {
    const customMessage = 'Concurrent request detected for this operation';
    const exception = new IdempotencyConflictException(customMessage);

    const response = exception.getResponse() as any;
    expect(response.error.message).toBe(customMessage);
  });
});
