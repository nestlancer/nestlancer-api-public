import { HttpException, HttpStatus } from '@nestjs/common';

/** Base application exception with error code support */
export class BaseAppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    public readonly details?: Record<string, unknown>[],
  ) {
    super(
      {
        status: 'error',
        error: {
          code,
          message,
          details,
          timestamp: new Date().toISOString(),
        },
      },
      statusCode,
    );
    this.message = message;
  }
}
