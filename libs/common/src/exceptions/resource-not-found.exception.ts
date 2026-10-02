import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

/** Thrown when a requested resource does not exist */
export class ResourceNotFoundException extends BaseAppException {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(ERROR_CODES.NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}
