import { Module, Global } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { SlackChannel } from './channels/slack.channel';
import { PagerdutyChannel } from './channels/pagerduty.channel';
import { EmailAlertChannel } from './channels/email-alert.channel';

@Global()
@Module({
  providers: [AlertsService, SlackChannel, PagerdutyChannel, EmailAlertChannel],
  exports: [AlertsService, SlackChannel, PagerdutyChannel, EmailAlertChannel],
})
export class AlertsModule {}
