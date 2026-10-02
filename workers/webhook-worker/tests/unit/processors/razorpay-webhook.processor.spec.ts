import { Test, TestingModule } from '@nestjs/testing';
import { RazorpayWebhookProcessor } from '../../../src/processors/razorpay-webhook.processor';
import { WebhookWorkerService } from '../../../src/services/webhook-worker.service';
import { LoggerService } from '@nestlancer/logger';
import { PrismaWriteService } from '@nestlancer/database';
import { IncomingWebhookJob } from '../../../src/interfaces/webhook-job.interface';

describe('RazorpayWebhookProcessor', () => {
  let processor: RazorpayWebhookProcessor;
  let webhookService: jest.Mocked<WebhookWorkerService>;
  let prismaWrite: jest.Mocked<PrismaWriteService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayWebhookProcessor,
        {
          provide: WebhookWorkerService,
          useValue: { dispatch: jest.fn() },
        },
        {
          provide: PrismaWriteService,
          useValue: { webhookLog: { update: jest.fn() } },
        },
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn() },
        },
      ],
    }).compile();

    processor = module.get<RazorpayWebhookProcessor>(RazorpayWebhookProcessor);
    webhookService = module.get(WebhookWorkerService);
    prismaWrite = module.get(PrismaWriteService);
    logger = module.get(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleRazorpay', () => {
    const job: IncomingWebhookJob = {
      incomingWebhookId: 'webhook-3',
      provider: 'razorpay',
      eventType: 'payment.captured',
      payload: { paymentId: 'pay_123' },
    };

    it('should dispatch event and mark log as PROCESSED', async () => {
      webhookService.dispatch.mockResolvedValue();
      prismaWrite.webhookLog.update.mockResolvedValue({} as any);

      await processor.handleRazorpay(job);

      expect(logger.log).toHaveBeenCalledWith('Processing Razorpay event: payment.captured');
      expect(webhookService.dispatch).toHaveBeenCalledWith('razorpay', 'payment.captured', {
        paymentId: 'pay_123',
      });
      expect(prismaWrite.webhookLog.update).toHaveBeenCalledWith({
        where: { id: 'webhook-3' },
        data: { status: 'PROCESSED', processedAt: expect.any(Date) },
      });
    });

    it('should mark log as FAILED and rethrow if error occurs', async () => {
      const error = new Error('Verification failed');
      webhookService.dispatch.mockRejectedValue(error);
      prismaWrite.webhookLog.update.mockResolvedValue({} as any);

      await expect(processor.handleRazorpay(job)).rejects.toThrow('Verification failed');

      expect(logger.error).toHaveBeenCalledWith(
        'Error processing Razorpay event payment.captured: Verification failed',
      );
      expect(prismaWrite.webhookLog.update).toHaveBeenCalledWith({
        where: { id: 'webhook-3' },
        data: { status: 'FAILED', error: 'Verification failed' },
      });
    });
  });
});
