import { Test, TestingModule } from '@nestjs/testing';
import { QueueModule } from '../../src/queue.module';
import { QueuePublisherService } from '../../src/queue-publisher.service';
import { ConfigModule } from '@nestjs/config';

// Mock amqplib
jest.mock('amqplib', () => ({
  connect: jest.fn().mockResolvedValue({
    createChannel: jest.fn().mockResolvedValue({
      publish: jest.fn(),
      sendToQueue: jest.fn(),
      on: jest.fn(),
      close: jest.fn(),
    }),
    on: jest.fn(),
    close: jest.fn(),
  }),
}));

describe('QueueModule (Integration)', () => {
  let module: TestingModule;
  let publisher: QueuePublisherService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        QueueModule.forRoot({ url: 'amqp://localhost' }),
      ],
      providers: [],
    }).compile();

    publisher = module.get<QueuePublisherService>(QueuePublisherService);
    await publisher.onModuleInit();
  });

  afterAll(async () => {
    if (module) {
      await publisher.onModuleDestroy();
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(publisher).toBeDefined();
  });

  it('should publish message to exchange', async () => {
    const payload = { test: 'data' };
    await publisher.publish('exchange', 'routing-key', payload);

    // verify interaction via channel (mocked)
    const channel = (publisher as any).channel;
    expect(channel.publish).toHaveBeenCalledWith(
      'exchange',
      'routing-key',
      Buffer.from(JSON.stringify(payload)),
      expect.any(Object),
    );
  });
});
