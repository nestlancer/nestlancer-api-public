import { HttpStatus } from '@nestjs/common';
import { BusinessLogicException } from '../../../src/exceptions/business-logic.exception';
import { ERROR_CODES } from '../../../src/constants/error-codes.constants';

describe('BusinessLogicException', () => {
  it('should create an exception with UNPROCESSABLE_ENTITY status and default code', () => {
    const msg = 'Invalid workflow state';
    const exception = new BusinessLogicException(msg);

    expect(exception.message).toBe(msg);
    expect(exception.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    const response = exception.getResponse() as any;
    expect(response.error.message).toBe(msg);
    expect(response.error.code).toBe(ERROR_CODES.BUSINESS_LOGIC_ERROR);
    expect(response.error.message).toBe(msg);
  });

  it('should allow overriding the error code', () => {
    const msg = 'Specific error';
    const exception = new BusinessLogicException(msg, 'SPECIFIC_ERR');

    const response = exception.getResponse() as any;
    expect(response.error.code).toBe('SPECIFIC_ERR');
  });

  it('maps QUOTE_001 to NOT_FOUND for IDOR-safe quote access', () => {
    const exception = new BusinessLogicException('Quote not found', 'QUOTE_001');
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
  });

  it('maps AUTH_PORTAL_MISMATCH to FORBIDDEN', () => {
    const exception = new BusinessLogicException(
      'Admin accounts must sign in on the admin app',
      'AUTH_PORTAL_MISMATCH',
    );
    expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
  });
});
