import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException)
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: WsException, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();
    const error = exception.getError();
    const payload =
      typeof error === 'object' && error !== null && 'code' in error
        ? error
        : { code: 'WS_ERROR', message: typeof error === 'string' ? error : 'WebSocket error' };

    this.logger.debug(`WsException for client ${client.id}: ${JSON.stringify(payload)}`);
    // Use 'exception' so client can listen; 'error' is reserved in socket.io-client and may not be delivered.
    client.emit('exception', payload);
  }
}
