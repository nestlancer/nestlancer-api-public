import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { getClientIp } from '../utils/client-ip.util';

/**
 * Extracts the originating client IP from the request (proxy-aware).
 * Usage: @ClientIp() ipAddress: string
 */
export const ClientIp = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();
  return getClientIp(request) ?? '';
});
