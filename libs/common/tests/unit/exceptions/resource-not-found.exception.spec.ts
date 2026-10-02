import { HttpStatus } from '@nestjs/common';
import { ResourceNotFoundException } from '../../../src/exceptions/resource-not-found.exception';
import { ERROR_CODES } from '../../../src/constants/error-codes.constants';

describe('ResourceNotFoundException', () => {
  it('should format message with resource and id correctly', () => {
    const resource = 'User';
    const id = '123';

    const exception = new ResourceNotFoundException(resource, id);

    expect(exception).toBeInstanceOf(ResourceNotFoundException);
    expect(exception.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);

    const response = exception.getResponse() as any;
    expect(response.error.message).toBe("User with id '123' not found");
  });

  it('should format message with only resource correctly', () => {
    const resource = 'Configuration';

    const exception = new ResourceNotFoundException(resource);

    expect(exception.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);

    const response = exception.getResponse() as any;
    expect(response.error.message).toBe('Configuration not found');
  });
});
