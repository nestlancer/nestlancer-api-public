import { Test, TestingModule } from '@nestjs/testing';
import { SlackChannel } from '../../../src/channels/slack.channel';
import { Logger } from '@nestjs/common';

describe('SlackChannel', () => {
  let channel: SlackChannel;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlackChannel],
    }).compile();

    channel = module.get<SlackChannel>(SlackChannel);
  });

  it('should be defined', () => {
    expect(channel).toBeDefined();
  });

  it('should send an alert via slack', async () => {
    const loggerSpy = jest.spyOn(Logger.prototype, 'debug');
    const payload = { text: 'Test Slack Alert' };

    await channel.send(payload);

    expect(loggerSpy).toHaveBeenCalledWith('Sending alert via slack:', payload);
  });
});
