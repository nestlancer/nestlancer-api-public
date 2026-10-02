import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailAlertChannel {
  private readonly logger = new Logger(EmailAlertChannel.name);
  async send(payload: Record<string, unknown>): Promise<void> {
    this.logger.debug('Sending alert via email-alert:', payload);
  }
}
