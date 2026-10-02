import { Test, TestingModule } from '@nestjs/testing';
import { QueuePublisherService } from '../../src/queue-publisher.service';
import { QueueConsumerService } from '../../src/queue-consumer.service';

// Mock amqplib so that integration tests don't require a real RabbitMQ broker.
type MessageHandler = (msg: { content: Buffer }) => Promise<void> | void;

jest.mock('amqplib', () => {
  const queues = new Map<string, Buffer[]>();
  const consumers = new Map<string, MessageHandler>();

  const channel = {
    assertExchange: jest.fn(async () => undefined),
    assertQueue: jest.fn(async (queue: string) => {
      if (!queues.has(queue)) queues.set(queue, []);
      return { queue };
    }),
    bindQueue: jest.fn(async () => undefined),
    publish: jest.fn(async (exchange: string, routingKey: string, content: Buffer) => {
      // Simple mock: deliver to any consumer registered for this routing key
      // or to the 'test.queue' if that's what we're testing.
      const handler = consumers.get(routingKey) || consumers.get('test.queue');
      if (handler) {
        await handler({ content } as any);
      }
      return true;
    }),
    sendToQueue: jest.fn(async (queue: string, content: Buffer) => {
      queues.get(queue)?.push(content);
      const handler = consumers.get(queue);
      if (handler) {
        await handler({ content } as any);
      }
      return true;
    }),
    consume: jest.fn(async (queue: string, onMessage: MessageHandler) => {
      consumers.set(queue, onMessage);
      const existing = queues.get(queue) || [];
      for (const msg of existing) {
        await onMessage({ content: msg } as any);
      }
    }),
    close: jest.fn(async () => undefined),
    prefetch: jest.fn(async () => undefined),
    ack: jest.fn(() => undefined),
    nack: jest.fn(() => undefined),
    on: jest.fn(),
  };

  return {
    connect: jest.fn(async () => ({
      on: jest.fn(),
      createChannel: async () => channel,
      close: async () => undefined,
    })),
  };
});

describe('Queue Services (Integration)', () => {
  let publisher: QueuePublisherService;
  let consumer: QueueConsumerService;

  const testExchange = 'test.exchange';
  const testQueue = 'test.queue';
  const testRoutingKey = 'test.key';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueuePublisherService,
        QueueConsumerService,
        {
          provide: 'QUEUE_OPTIONS',
          useValue: { url: 'amqp://guest:guest@localhost:5672' },
        },
      ],
    }).compile();

    publisher = module.get<QueuePublisherService>(QueuePublisherService);
    consumer = module.get<QueueConsumerService>(QueueConsumerService);

    await publisher.onModuleInit();
    await consumer.onModuleInit();
  });

  afterEach(async () => {
    if (publisher) {
      await publisher.onModuleDestroy();
    }
  });

  it('should publish and consume a message', async () => {
    const payload = { message: 'Hello RabbitMQ', timestamp: Date.now() };
    let receivedPayload: any = null;

    const channel = consumer.getChannel();
    await channel.assertExchange(testExchange, 'topic', { durable: true });
    await channel.assertQueue(testQueue, { durable: true });
    await channel.bindQueue(testQueue, testExchange, testRoutingKey);

    await consumer.consume(testQueue, async (msg) => {
      receivedPayload = JSON.parse(msg.content.toString());
    });

    await publisher.publish(testExchange, testRoutingKey, payload);

    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (receivedPayload) {
          clearInterval(check);
          resolve(null);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(check);
        resolve(null);
      }, 2000);
    });

    expect(receivedPayload).toEqual(payload);
  });

  it('should send directly to queue and consume', async () => {
    const payload = { direct: true };
    let receivedPayload: any = null;

    await consumer.getChannel().assertQueue(testQueue, { durable: true });

    await consumer.consume(testQueue, async (msg) => {
      receivedPayload = JSON.parse(msg.content.toString());
    });

    await publisher.sendToQueue(testQueue, payload);

    await new Promise((resolve) => {
      const check = setInterval(() => {
        if (receivedPayload) {
          clearInterval(check);
          resolve(null);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(check);
        resolve(null);
      }, 2000);
    });

    expect(receivedPayload).toEqual(payload);
  });
});
