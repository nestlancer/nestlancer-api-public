import { Module, Global } from '@nestjs/common';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { WsThrottleGuard } from './guards/ws-throttle.guard';

@Global()
@Module({
  providers: [WsAuthGuard, WsThrottleGuard],
  exports: [WsAuthGuard, WsThrottleGuard],
})
export class WebSocketLibModule {}
