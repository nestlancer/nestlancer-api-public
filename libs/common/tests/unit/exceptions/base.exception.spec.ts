import { HttpStatus } from '@nestjs/common';
import { BaseAppException } from '../../../src/exceptions/base.exception';

describe('BaseAppException', () => {
  it('should initialize with correct default values', () => {
    const code = 'TEST_ERROR';
    const message = 'Test error message';

    // Using a fixed timestamp for testing
    const originalDate = Date;
    const fixedDate = new Date('2024-01-01T00:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as unknown as Date);

    const exception = new BaseAppException(code, message);

    expect(exception).toBeInstanceOf(BaseAppException);
    expect(exception.code).toBe(code);
    expect(exception.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

    const response = exception.getResponse() as any;
    expect(response).toMatchObject({
      status: 'error',
      error: {
        code,
        message,
        timestamp: fixedDate.toISOString(),
      },
    });
    expect(response.error.details).toBeUndefined();

    // Restore date mock
    jest.restoreAllMocks();
  });

  it('should initialize with custom status code and details', () => {
    const code = 'CUSTOM_ERROR';
    const message = 'Custom error message';
    const statusCode = HttpStatus.BAD_REQUEST;
    const details = [{ field: 'email', issue: 'invalid format' }];

    const originalDate = Date;
    const fixedDate = new Date('2024-01-01T00:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as unknown as Date);

    const exception = new BaseAppException(code, message, statusCode, details);

    expect(exception.getStatus()).toBe(statusCode);
    expect(exception.details).toEqual(details);

    const response = exception.getResponse() as any;
    expect(response.error.details).toEqual(details);

    jest.restoreAllMocks();
  });
});
