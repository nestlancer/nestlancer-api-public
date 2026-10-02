import { Test, TestingModule } from '@nestjs/testing';
import { WebhookConsumer } from '../../../src/consumers/webhook.consumer';
import { LoggerService } from '@nestlancer/logger';
import { QueueConsumerService, DlqService } from '@nestlancer/queue';
import { MetricsService } from '@nestlancer/metrics';
import { WebhookWorkerService } from '../../../src/services/webhook-worker.service';
import { PrismaWriteService } from '@nestlancer/database';
import { ConfigService } from '@nestjs/config';

describe('WebhookConsumer', () => {
  let consumer: WebhookConsumer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookConsumer,
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
        },
        {
          provide: QueueConsumerService,
          useValue: {
            consume: jest.fn(),
            getChannel: jest.fn().mockReturnValue({
              assertQueue: jest.fn().mockResolvedValue(undefined),
            }),
          },
        },
        {
          provide: WebhookWorkerService,
          useValue: { dispatch: jest.fn() },
        },
        {
          provide: PrismaWriteService,
          useValue: {
            webhookLog: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'webhook-worker.queues')
                return ['payments.webhook.queue', 'system.webhook.queue'];
              if (key === 'webhook-worker.maxRetries') return 5;
              if (key === 'webhook-worker.backoffBaseSeconds') return 10;
              if (key === 'webhook-worker.backoffMultiplier') return 3;
              return undefined;
            }),
          },
        },
        {
          provide: DlqService,
          useValue: { sendToDlq: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: MetricsService,
          useValue: {
            createCounter: jest.fn(),
            incrementCounter: jest.fn(),
          },
        },
      ],
    }).compile();

    consumer = module.get<WebhookConsumer>(WebhookConsumer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(consumer).toBeDefined();
  });
});
