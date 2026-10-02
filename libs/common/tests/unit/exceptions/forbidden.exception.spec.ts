import { HttpStatus } from '@nestjs/common';
import { ForbiddenException } from '../../../src/exceptions/forbidden.exception';
import { ERROR_CODES } from '../../../src/constants/error-codes.constants';

describe('ForbiddenException', () => {
  it('should use default message if none is provided', () => {
    const exception = new ForbiddenException();

    expect(exception).toBeInstanceOf(ForbiddenException);
    expect(exception.code).toBe(ERROR_CODES.FORBIDDEN);
    expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);

    const response = exception.getResponse() as any;
    expect(response.error.message).toBe('You do not have permission to perform this action');
  });

  it('should use custom message if provided', () => {
    const customMessage = 'Admin access required';
    const exception = new ForbiddenException(customMessage);

    const response = exception.getResponse() as any;
    expect(response.error.message).toBe(customMessage);
  });
});
