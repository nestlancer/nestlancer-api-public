import { createParamDecorator, ExecutionContext } from '@nestjs/common';
export const WsCurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToWs().getClient().data?.user;
});
