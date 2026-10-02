import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from './base.exception';
import { ERROR_CODES } from '../constants/error-codes.constants';

function mapBusinessCodeToStatus(code: string): HttpStatus {
  switch (code) {
    // Requests domain (see 104-requests-endpoints.md)
    case 'REQUEST_001':
      return HttpStatus.NOT_FOUND; // Request not found
    case 'REQUEST_002':
    case 'REQUEST_003':
    case 'REQUEST_004':
    case 'REQUEST_005':
    case 'REQUEST_012':
      return HttpStatus.BAD_REQUEST;
    case 'REQUEST_006':
      return HttpStatus.CONFLICT;
    case 'REQUEST_011':
      return HttpStatus.PAYLOAD_TOO_LARGE;

    // Quotes / projects domain
    case 'QUOTE_001':
    case 'PROJECT_001':
      return HttpStatus.NOT_FOUND;

    // Auth — invalid credentials must be 401, not 422 (NL-BUG-SEC-002)
    case 'AUTH_001':
      return HttpStatus.UNAUTHORIZED;
    // Auth — invalid/expired/reused refresh tokens (NL-BUG-AUTH-002)
    case 'AUTH_004':
      return HttpStatus.UNAUTHORIZED;
    // Auth — wrong-portal login is forbidden, not a validation error (NL-BUG-AUTH-001)
    case 'AUTH_PORTAL_MISMATCH':
      return HttpStatus.FORBIDDEN;
    // Concurrent refresh race — keep cookies; client should retry (NL-BUG-SESSION-01)
    case 'AUTH_REFRESH_BUSY':
      return HttpStatus.SERVICE_UNAVAILABLE;

    // Payment gating
    case 'PAYMENT_GATE_003': // already completed
      return HttpStatus.CONFLICT;
    case 'PROJECT_005': // already completed / terminal
      return HttpStatus.CONFLICT;
    case 'PAYMENT_GATE_006': // milestone not found
    case 'PAYMENT_GATE_005': // project access denied
      return HttpStatus.NOT_FOUND;
    case 'PAYMENT_GATE_007': // invalid amount
      return HttpStatus.BAD_REQUEST;
    case 'PAYMENT_GATE_018': // provider rejected the order
      return HttpStatus.UNPROCESSABLE_ENTITY;
    case 'PAYMENT_GATE_019': // duplicate transfer reference
    case 'PAYMENT_GATE_020': // dispute invalid payment status
    case 'PAYMENT_GATE_021': // dispute already open
      return HttpStatus.CONFLICT;
    case 'PAYMENT_GATE_022': // invalid saved-method token
      return HttpStatus.BAD_REQUEST;

    // Explicitly documented as 422
    case 'REQUEST_007':
    case 'REQUEST_008':
    case 'REQUEST_009':
    case 'REQUEST_010':
      return HttpStatus.UNPROCESSABLE_ENTITY;

    // Contact domain (see docs/api/services/contact.md)
    case 'CONTACT_005':
      return HttpStatus.BAD_REQUEST; // Turnstile verification failed

    default:
      return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}

/** Thrown when a business rule is violated */
export class BusinessLogicException extends BaseAppException {
  constructor(
    message: string,
    code: string = ERROR_CODES.BUSINESS_LOGIC_ERROR,
    details?: Record<string, unknown>,
  ) {
    const status =
      code === ERROR_CODES.BUSINESS_LOGIC_ERROR
        ? HttpStatus.UNPROCESSABLE_ENTITY
        : mapBusinessCodeToStatus(code);
    super(code, message, status, details ? [details] : undefined);
  }
}
