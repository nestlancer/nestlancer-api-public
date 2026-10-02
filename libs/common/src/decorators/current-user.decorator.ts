import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/request-context.interface';

/**
 * Extracts authenticated user from request.
 * Usage: @CurrentUser() user: AuthenticatedUser
 * Usage: @CurrentUser('userId') userId: string
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return field ? user?.[field] : user;
  },
);
