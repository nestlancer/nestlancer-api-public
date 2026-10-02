import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator that extracts the authenticated user (or a property of it) from the request.
 *
 * @example
 * - `@ActiveUser() user`
 * - `@ActiveUser('userId') userId`
 */
export const ActiveUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

/**
 * Alias for ActiveUser to match common NestJS naming conventions.
 */
export const CurrentUser = ActiveUser;
