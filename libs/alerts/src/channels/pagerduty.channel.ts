import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PagerdutyChannel {
  private readonly logger = new Logger(PagerdutyChannel.name);
  async send(payload: Record<string, unknown>): Promise<void> {
    this.logger.debug('Sending alert via pagerduty:', payload);
  }
}
