import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the room name from the WebSocket message payload (e.g. projectId -> project:${id}).
 */
export const WsRoom = createParamDecorator(
  (data: { prefix: string; key?: string }, ctx: ExecutionContext): string | null => {
    if (!data?.prefix) return null;
    const client = ctx.switchToWs().getClient();
    const payload = ctx.getArgByIndex(1);
    const key = data.key ?? 'projectId';
    const id = payload?.[key];
    if (!id) return null;
    return `${data.prefix}:${id}`;
  },
);
