import { Test, TestingModule } from '@nestjs/testing';
import { QueuePublisherService } from '../../src/queue-publisher.service';
import * as amqp from 'amqplib';

jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

describe('QueuePublisherService', () => {
  let service: QueuePublisherService;
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(async () => {
    mockChannel = {
      assertExchange: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn(),
      sendToQueue: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    };
    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn(),
      on: jest.fn(),
    };
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueuePublisherService,
        {
          provide: 'QUEUE_OPTIONS',
          useValue: { url: 'amqp://localhost:5672' },
        },
      ],
    }).compile();

    service = module.get<QueuePublisherService>(QueuePublisherService);
    await service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should publish a message', async () => {
    const payload = { test: 'data' };
    await service.publish('exchange1', 'rk1', payload);

    expect(mockChannel.assertExchange).toHaveBeenCalledWith('exchange1', 'topic', {
      durable: true,
    });
    expect(mockChannel.publish).toHaveBeenCalledWith(
      'exchange1',
      'rk1',
      expect.any(Buffer),
      expect.objectContaining({
        persistent: true,
        messageId: expect.any(String),
        correlationId: expect.any(String),
      }),
    );
  });

  it('should send to queue', async () => {
    const payload = { test: 'data' };
    await service.sendToQueue('queue1', payload);

    expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
      'queue1',
      expect.any(Buffer),
      expect.objectContaining({
        persistent: true,
        messageId: expect.any(String),
        correlationId: expect.any(String),
      }),
    );
  });
});