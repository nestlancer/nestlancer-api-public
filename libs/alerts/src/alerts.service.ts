import { Injectable, Logger } from '@nestjs/common';
import { AlertPayload } from './interfaces/alert.interface';
import { SlackChannel } from './channels/slack.channel';
import { PagerdutyChannel } from './channels/pagerduty.channel';
import { EmailAlertChannel } from './channels/email-alert.channel';
import { ALERT_RULES } from './rules/alert-rules.config';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly slackChannel: SlackChannel,
    private readonly pagerdutyChannel: PagerdutyChannel,
    private readonly emailChannel: EmailAlertChannel,
  ) {}

  async sendAlert(alert: AlertPayload): Promise<void> {
    this.logger.warn(`ALERT [${alert.severity}]: ${alert.title} - ${alert.message}`);

    // Find rules that match the alert (e.g., by title/source if needed,
    // but for now let's use a simple mapping based on severity or specific names)
    const matchingRules = ALERT_RULES.filter(
      (rule) =>
        alert.title.toLowerCase().includes(rule.name.toLowerCase().replace(/_/g, ' ')) ||
        alert.severity === rule.severity,
    );

    const channelsToNotify = new Set<string>();
    matchingRules.forEach((rule) => {
      rule.channels.forEach((channel) => channelsToNotify.add(channel));
    });

    const promises: Promise<void>[] = [];

    if (channelsToNotify.has('slack')) {
      promises.push(this.slackChannel.send(alert as any));
    }
    if (channelsToNotify.has('pagerduty')) {
      promises.push(this.pagerdutyChannel.send(alert as any));
    }
    if (channelsToNotify.has('email')) {
      promises.push(this.emailChannel.send(alert as any));
    }

    await Promise.allSettled(promises);
  }
}
