import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from '../../src/alerts.service';
import { SlackChannel } from '../../src/channels/slack.channel';
import { PagerdutyChannel } from '../../src/channels/pagerduty.channel';
import { EmailAlertChannel } from '../../src/channels/email-alert.channel';
import { AlertPayload } from '../../src/interfaces/alert.interface';
import { Logger } from '@nestjs/common';

describe('AlertsService', () => {
  let service: AlertsService;
  let slackChannel: SlackChannel;
  let pagerdutyChannel: PagerdutyChannel;
  //    let emailChannel: EmailAlertChannel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: SlackChannel,
          useValue: { send: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: PagerdutyChannel,
          useValue: { send: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: EmailAlertChannel,
          useValue: { send: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    slackChannel = module.get<SlackChannel>(SlackChannel);
    pagerdutyChannel = module.get<PagerdutyChannel>(PagerdutyChannel);
    //        emailChannel = module.get<EmailAlertChannel>(EmailAlertChannel);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log the alert pulse', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'warn');
    const alert: AlertPayload = {
      title: 'Test Alert',
      message: 'This is a test',
      severity: 'warning',
      source: 'test-source',
    };

    await service.sendAlert(alert);

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('ALERT [warning]: Test Alert - This is a test'),
    );
  });

  it('should route critical alerts to pagerduty and slack', async () => {
    const alert: AlertPayload = {
      title: 'Service Down',
      message: 'The service is unresponsive',
      severity: 'critical',
      source: 'test-source',
    };

    await service.sendAlert(alert);

    expect(pagerdutyChannel.send).toHaveBeenCalledWith(alert);
    expect(slackChannel.send).toHaveBeenCalledWith(alert);
  });

  it('should route warning alerts to slack', async () => {
    const alert: AlertPayload = {
      title: 'High Error Rate',
      message: 'Errors are increasing',
      severity: 'warning',
      source: 'test-source',
    };

    await service.sendAlert(alert);

    expect(slackChannel.send).toHaveBeenCalledWith(alert);
    expect(pagerdutyChannel.send).not.toHaveBeenCalled();
  });

  // Note: The current implementation of sendAlert only logs.
  // In a real scenario, it should route to channels.
  // I will implement the tests for routing as well,
  // which might require updating the service if it's not yet implemented there.
});
