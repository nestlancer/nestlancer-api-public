import { BadRequestException } from '@nestjs/common';

/**
 * Resolve the acting admin user id from gateway-injected headers or JWT payload.
 * Gateway trust model sets `x-user-id` / `x-user-role`; `req.user` is often unset.
 */
export function resolveAdminUserId(req: {
  headers?: Record<string, string | string[] | undefined>;
  user?: { sub?: string };
}): string {
  const rawUserId = req.headers?.['x-user-id'];
  const fromHeader = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  const id = req.user?.sub || fromHeader;
  if (!id || typeof id !== 'string') {
    throw new BadRequestException('Missing admin user identity');
  }
  return id;
}
