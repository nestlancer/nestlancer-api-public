import { HttpStatus } from '@nestjs/common';
import { ResourceConflictException } from '../../../src/exceptions/resource-conflict.exception';
import { ERROR_CODES } from '../../../src/constants/error-codes.constants';

describe('ResourceConflictException', () => {
  it('should use the provided message', () => {
    const customMessage = 'User with this email already exists';
    const exception = new ResourceConflictException(customMessage);

    expect(exception).toBeInstanceOf(ResourceConflictException);
    expect(exception.code).toBe(ERROR_CODES.ALREADY_EXISTS);
    expect(exception.getStatus()).toBe(HttpStatus.CONFLICT);

    const response = exception.getResponse() as any;
    expect(response.error.message).toBe(customMessage);
  });
});
