import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

/** Thrown when user lacks permission for an action */
export class ForbiddenException extends BaseAppException {
  constructor(message: string = 'You do not have permission to perform this action') {
    super(ERROR_CODES.FORBIDDEN, message, HttpStatus.FORBIDDEN);
  }
}
