import { HttpStatus } from '@nestjs/common';
import { ValidationException } from '../../../src/exceptions/validation.exception';
import { ERROR_CODES } from '../../../src/constants/error-codes.constants';

describe('ValidationException', () => {
  it('should create an exception with BAD_REQUEST status and validation error code', () => {
    const exception = new ValidationException();

    expect(exception.message).toBe('Validation failed');
    expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    const response = exception.getResponse() as any;
    expect(response.error.message).toBe('Validation failed');
    expect(response.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it('should include validation details if provided', () => {
    const details = [{ field: 'email', constraints: { isEmail: 'must be an email' } }];
    const exception = new ValidationException('Input invalid', details);

    const response = exception.getResponse() as any;
    expect(response.error.details).toEqual(details);
    expect(response.error.message).toBe('Input invalid');
  });
});
