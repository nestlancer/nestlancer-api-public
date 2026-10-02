import { DlqService } from '../../src/dlq.service';
import { QueuePublisherService } from '../../src/queue-publisher.service';
import { Logger } from '@nestjs/common';

jest.mock('@nestjs/common', () => {
  const original = jest.requireActual('@nestjs/common');
  return {
    ...original,
    Logger: jest.fn().mockImplementation(() => ({
      warn: jest.fn(),
    })),
  };
});

describe('DlqService', () => {
  let dlqService: DlqService;
  let publisherServiceMock: jest.Mocked<QueuePublisherService>;

  beforeEach(() => {
    publisherServiceMock = {
      sendToQueue: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<QueuePublisherService>;

    dlqService = new DlqService(publisherServiceMock);
  });

  it('should send failed messages to the related DLQ', async () => {
    const payload = { id: 1, text: 'test' };
    await dlqService.sendToDlq('main.queue', payload, 'Parsing Error');

    expect(publisherServiceMock.sendToQueue).toHaveBeenCalledWith(
      'main.queue.dlq',
      expect.objectContaining({
        originalQueue: 'main.queue',
        error: 'Parsing Error',
        message: payload,
        failedAt: expect.any(String),
      }),
    );
  });
});
