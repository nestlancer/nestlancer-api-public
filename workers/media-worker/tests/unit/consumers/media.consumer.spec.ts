import { Test, TestingModule } from '@nestjs/testing';
import { MediaConsumer } from '../../../src/consumers/media.consumer';
import { MediaWorkerService } from '../../../src/services/media-worker.service';
import { QueueConsumerService, DlqService } from '@nestlancer/queue';
import { LoggerService } from '@nestlancer/logger';

describe('MediaConsumer', () => {
  let provider: MediaConsumer;
  let mediaWorkerService: MediaWorkerService;
  let queueConsumerService: QueueConsumerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaConsumer,
        {
          provide: MediaWorkerService,
          useValue: {
            processJob: jest.fn(),
          },
        },
        {
          provide: QueueConsumerService,
          useValue: {
            consume: jest.fn(),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
        { provide: DlqService, useValue: { sendToDlq: jest.fn() } },
      ],
    }).compile();

    provider = module.get<MediaConsumer>(MediaConsumer);
    mediaWorkerService = module.get<MediaWorkerService>(MediaWorkerService);
    queueConsumerService = module.get<QueueConsumerService>(QueueConsumerService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should start consuming messages', async () => {
      await provider.onModuleInit();
      expect(queueConsumerService.consume).toHaveBeenCalledWith(
        'media_processing_queue',
        expect.any(Function),
      );
    });
  });
});
