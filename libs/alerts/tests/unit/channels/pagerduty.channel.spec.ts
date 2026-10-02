import { Test, TestingModule } from '@nestjs/testing';
import { PagerdutyChannel } from '../../../src/channels/pagerduty.channel';
import { Logger } from '@nestjs/common';

describe('PagerdutyChannel', () => {
  let channel: PagerdutyChannel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PagerdutyChannel],
    }).compile();

    channel = module.get<PagerdutyChannel>(PagerdutyChannel);
  });

  it('should be defined', () => {
    expect(channel).toBeDefined();
  });

  it('should send an alert via pagerduty', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
    const payload = { text: 'Test PagerDuty Alert' };

    await channel.send(payload);

    expect(loggerSpy).toHaveBeenCalledWith('Sending alert via pagerduty:', payload);
  });
});
