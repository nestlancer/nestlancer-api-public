import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

/** Thrown when input validation fails */
export class ValidationException extends BaseAppException {
  constructor(
    message: string = 'Validation failed',
    details?: Array<{ field: string; constraints: Record<string, string> }>,
  ) {
    super(ERROR_CODES.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST, details);
  }
}
