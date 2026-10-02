import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface WsCurrentUserPayload {
  userId: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

/**
 * Extracts the current user from the WebSocket client (set by WsAuthGuard).
 */
export const WsCurrentUser = createParamDecorator(
  (
    data: keyof WsCurrentUserPayload | undefined,
    ctx: ExecutionContext,
  ): WsCurrentUserPayload | string | unknown => {
    const client = ctx.switchToWs().getClient();
    const user = client.data?.user as WsCurrentUserPayload | undefined;
    if (!user) return null;
    return data ? user[data] : user;
  },
);
