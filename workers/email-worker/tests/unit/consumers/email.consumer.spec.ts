import { Test, TestingModule } from '@nestjs/testing';
import { EmailConsumer } from '../../../src/consumers/email.consumer';
import { QueueConsumerService } from '@nestlancer/queue';
import { EmailDispatcherService } from '../../../src/services/email-dispatcher.service';
import { ConfigService } from '@nestjs/config';

describe('EmailConsumer', () => {
  let consumer: EmailConsumer;
  let queueConsumerService: jest.Mocked<QueueConsumerService>;
  let dispatcher: jest.Mocked<EmailDispatcherService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailConsumer,
        {
          provide: QueueConsumerService,
          useValue: { consume: jest.fn() },
        },
        {
          provide: EmailDispatcherService,
          useValue: { dispatch: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('email.queue') },
        },
      ],
    }).compile();

    consumer = module.get<EmailConsumer>(EmailConsumer);
    queueConsumerService = module.get(QueueConsumerService);
    dispatcher = module.get(EmailDispatcherService);
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should start consuming from the configured queue', async () => {
      await consumer.onModuleInit();
      expect(queueConsumerService.consume).toHaveBeenCalledWith(
        'email.queue',
        expect.any(Function),
      );
    });

    it('should dispatch parsed messages with routing key', async () => {
      let messageHandler: (msg: {
        content: Buffer;
        fields: { routingKey: string };
      }) => Promise<void>;
      queueConsumerService.consume.mockImplementation(async (_queue, handler) => {
        messageHandler = handler;
      });

      await consumer.onModuleInit();

      const mockMsg = {
        content: Buffer.from(
          JSON.stringify({
            type: 'WELCOME',
            to: 'test@example.com',
            data: { userName: 'Test' },
          }),
        ),
        fields: { routingKey: 'email.welcome' },
      };

      await messageHandler!(mockMsg);

      expect(dispatcher.dispatch).toHaveBeenCalledWith(
        'email.welcome',
        expect.objectContaining({ type: 'WELCOME', to: 'test@example.com' }),
      );
    });
  });
});
