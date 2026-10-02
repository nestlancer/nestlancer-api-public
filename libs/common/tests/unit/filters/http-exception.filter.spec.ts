import { HttpExceptionFilter } from '../../../src/filters/http-exception.filter';
import { HttpException, ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let host: ArgumentsHost;
  let response: any;
  let request: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    request = {
      url: '/error-path',
      method: 'GET',
      headers: {
        'x-correlation-id': 'corr-id',
      },
    };
    host = {
      switchToHttp: jest.fn().mockReturnThis(),
      getRequest: jest.fn().mockReturnValue(request),
      getResponse: jest.fn().mockReturnValue(response),
    } as any;
  });

  it('should format HttpException correctly', () => {
    const exception = new HttpException('Forbidden', 403);

    filter.catch(exception, host);

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        error: expect.objectContaining({
          code: 'HTTP_403',
          message: 'Forbidden',
          requestId: 'corr-id',
          path: '/error-path',
        }),
      }),
    );
  });

  it('should handle validation error messages (arrays)', () => {
    const messages = ['email must be an email', 'password is too short'];
    const exception = new HttpException({ message: messages }, 400);

    filter.catch(exception, host);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'email must be an email, password is too short',
        }),
      }),
    );
  });
});
