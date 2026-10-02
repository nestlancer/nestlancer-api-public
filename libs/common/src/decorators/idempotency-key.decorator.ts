import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts X-Idempotency-Key from request headers.
 * Usage: @IdempotencyKey() key: string
 */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-idempotency-key'] as string | undefined;
  },
);
