import { Test, TestingModule } from '@nestjs/testing';
import { EmailAlertChannel } from '../../../src/channels/email-alert.channel';
import { Logger } from '@nestjs/common';

describe('EmailAlertChannel', () => {
  let channel: EmailAlertChannel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailAlertChannel],
    }).compile();

    channel = module.get<EmailAlertChannel>(EmailAlertChannel);
  });

  it('should be defined', () => {
    expect(channel).toBeDefined();
  });

  it('should send an alert via email', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
    const payload = { text: 'Test Email Alert' };

    await channel.send(payload);

    expect(loggerSpy).toHaveBeenCalledWith('Sending alert via email-alert:', payload);
  });
});
