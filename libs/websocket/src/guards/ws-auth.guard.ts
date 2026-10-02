import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { attachAuthenticatedWsUser } from '../utils/ws-auth.util';

@Injectable()
export class WsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    attachAuthenticatedWsUser(client);
    return true;
  }
}
