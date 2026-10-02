import { Test, TestingModule } from '@nestjs/testing';
import { RazorpayWebhookProcessor } from '../../src/processors/razorpay-webhook.processor';
import { LoggerService } from '@nestlancer/logger';
import { WebhookWorkerService } from '../../src/services/webhook-worker.service';
import { PrismaWriteService } from '@nestlancer/database';

describe('RazorpayWebhookProcessor', () => {
  let processor: RazorpayWebhookProcessor;
  let webhookService: WebhookWorkerService;
  let prisma: PrismaWriteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayWebhookProcessor,
        {
          provide: LoggerService,
          useValue: { log: jest.fn(), error: jest.fn() },
        },
        {
          provide: WebhookWorkerService,
          useValue: { dispatch: jest.fn() },
        },
        {
          provide: PrismaWriteService,
          useValue: { webhookLog: { update: jest.fn() } },
        },
      ],
    }).compile();

    processor = module.get<RazorpayWebhookProcessor>(RazorpayWebhookProcessor);
    webhookService = module.get<WebhookWorkerService>(WebhookWorkerService);
    prisma = module.get<PrismaWriteService>(PrismaWriteService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  it('should dispatch razorpay events and update status', async () => {
    const job = {
      provider: 'razorpay',
      eventType: 'payment.captured',
      payload: { id: 'pay_123' },
      incomingWebhookId: 'webhook_123',
      eventId: 'evt_123',
    };

    await processor.handleRazorpay(job);

    expect(webhookService.dispatch).toHaveBeenCalledWith(
      'razorpay',
      'payment.captured',
      job.payload,
    );
    expect(prisma.webhookLog.update).toHaveBeenCalledWith({
      where: { id: 'webhook_123' },
      data: { status: 'PROCESSED', processedAt: expect.any(Date) },
    });
  });
});
