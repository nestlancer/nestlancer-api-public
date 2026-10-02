import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

/** Thrown when a resource already exists or conflicts */
export class ResourceConflictException extends BaseAppException {
  constructor(message: string) {
    super(ERROR_CODES.ALREADY_EXISTS, message, HttpStatus.CONFLICT);
  }
}
