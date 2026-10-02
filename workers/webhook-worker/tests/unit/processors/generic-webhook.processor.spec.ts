import { Test, TestingModule } from '@nestjs/testing';
import { GenericWebhookProcessor } from '../../../src/processors/generic-webhook.processor';
import { PrismaWriteService } from '@nestlancer/database';
import { LoggerService } from '@nestlancer/logger';
import { IncomingWebhookJob } from '../../../src/interfaces/webhook-job.interface';

describe('GenericWebhookProcessor', () => {
  let processor: GenericWebhookProcessor;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenericWebhookProcessor,
        {
          provide: PrismaWriteService,
          useValue: { webhookLog: { update: jest.fn() } },
        },
        {
          provide: LoggerService,
          useValue: { warn: jest.fn(), log: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get<GenericWebhookProcessor>(GenericWebhookProcessor);
    prismaWrite = module.get(PrismaWriteService);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleGeneric', () => {
    it('should log warning and update webhook log as failed', async () => {
      prismaWrite.webhookLog.update.mockResolvedValue({} as any);

      const job: IncomingWebhookJob = {
        incomingWebhookId: 'webhook-1',
        provider: 'UNKNOWN',
        eventType: 'unknown.event',
        payload: { data: 'test' },
      };

      await processor.handleGeneric(job);

      expect(logger.warn).toHaveBeenCalledWith(
        'Received generic webhook event from UNKNOWN: unknown.event',
      );
      expect(prismaWrite.webhookLog.update).toHaveBeenCalledWith({
        where: { id: 'webhook-1' },
        data: { status: 'FAILED', error: 'Generic processor fallback for UNKNOWN' },
      });
    });
  });
});
