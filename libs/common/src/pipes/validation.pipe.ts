import { ValidationPipe as NestValidationPipe, ValidationError } from '@nestjs/common';
import { ValidationException } from '../exceptions/validation.exception';

/**
 * Extended ValidationPipe with standard error format per 100-api-standards.
 */
export class AppValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) => {
        const details = errors.map((error) => ({
          field: error.property,
          constraints: error.constraints || {},
        }));

        return new ValidationException('Request validation failed', details);
      },
    });
  }
}
