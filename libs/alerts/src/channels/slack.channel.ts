import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SlackChannel {
  private readonly logger = new Logger(SlackChannel.name);
  async send(payload: Record<string, unknown>): Promise<void> {
    this.logger.debug('Sending alert via slack:', payload);
  }
}
