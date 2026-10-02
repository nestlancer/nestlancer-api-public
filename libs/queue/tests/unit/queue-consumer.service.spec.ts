import { Test, TestingModule } from '@nestjs/testing';
import { QueueConsumerService } from '../../src/queue-consumer.service';
import * as amqp from 'amqplib';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

describe('QueueConsumerService', () => {
  let service: QueueConsumerService;
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(async () => {
    mockChannel = {
      createChannel: jest.fn(),
      prefetch: jest.fn(),
      assertQueue: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      on: jest.fn(),
    };
    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      on: jest.fn(),
    };
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueConsumerService,
        {
          provide: 'QUEUE_OPTIONS',
          useValue: { url: 'amqp://localhost:5672' },
        },
      ],
    }).compile();

    service = module.get<QueueConsumerService>(QueueConsumerService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should consume messages', async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    await service.consume('test-queue', handler);

    expect(mockChannel.assertQueue).toHaveBeenCalledWith('test-queue', { durable: true });
    expect(mockChannel.consume).toHaveBeenCalled();

    const consumeCallback = mockChannel.consume.mock.calls[0][1];
    const mockMsg = { content: Buffer.from('test') };

    await consumeCallback(mockMsg);

    expect(handler).toHaveBeenCalled();
    expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
  });
});
