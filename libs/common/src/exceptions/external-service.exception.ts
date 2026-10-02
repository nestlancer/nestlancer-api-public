import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

/** Thrown when an external service call fails */
export class ExternalServiceException extends BaseAppException {
  constructor(service: string, message?: string) {
    super(
      ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      message || `External service '${service}' is unavailable`,
      HttpStatus.BAD_GATEWAY,
    );
  }
}
