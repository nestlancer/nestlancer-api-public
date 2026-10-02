import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

/** Thrown when an idempotency conflict is detected */
export class IdempotencyConflictException extends BaseAppException {
  constructor(message: string = 'Request with this idempotency key is already being processed') {
    super(ERROR_CODES.IDEMPOTENCY_CONFLICT, message, HttpStatus.CONFLICT);
  }
}
