import { HttpStatus } from '@nestjs/common';
import { ExternalServiceException } from '../../../src/exceptions/external-service.exception';
import { ERROR_CODES } from '../../../src/constants/error-codes.constants';

describe('ExternalServiceException', () => {
  it('should format default message with service name', () => {
    const service = 'PaymentGateway';

    const exception = new ExternalServiceException(service);

    expect(exception).toBeInstanceOf(ExternalServiceException);
    expect(exception.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
    expect(exception.getStatus()).toBe(HttpStatus.BAD_GATEWAY);

    const response = exception.getResponse() as any;
    expect(response.error.message).toBe("External service 'PaymentGateway' is unavailable");
  });

  it('should use custom message if provided', () => {
    const service = 'GithubAPI';
    const customMessage = 'Rate limit exceeded for Github API';

    const exception = new ExternalServiceException(service, customMessage);

    const response = exception.getResponse() as any;
    expect(response.error.message).toBe(customMessage);
  });
});
