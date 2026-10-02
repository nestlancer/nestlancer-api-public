import { Test, TestingModule } from '@nestjs/testing';
import { RazorpayWebhookController } from '../../../../src/controllers/webhooks/razorpay-webhook.controller';
import { RazorpayWebhookService } from '../../../../src/services/razorpay-webhook.service';

describe('RazorpayWebhookController', () => {
  let controller: RazorpayWebhookController;
  let webhookService: jest.Mocked<RazorpayWebhookService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RazorpayWebhookController],
      providers: [
        {
          provide: RazorpayWebhookService,
          useValue: {
            handleWebhook: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RazorpayWebhookController>(RazorpayWebhookController);
    webhookService = module.get(RazorpayWebhookService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    it('should call webhookService.handleWebhook', async () => {
      webhookService.handleWebhook.mockResolvedValue({ status: 'ok' });

      const req = { rawBody: Buffer.from('test') } as any;
      const result = await controller.handleWebhook('sig1', req, { event: 'payment.captured' });

      expect(webhookService.handleWebhook).toHaveBeenCalledWith('sig1', 'test', {
        event: 'payment.captured',
      });
      expect(result).toEqual({ status: 'ok' });
    });

    it('should throw Error if rawBody is missing', async () => {
      const req = {} as any;
      await expect(controller.handleWebhook('sig1', req, {})).rejects.toThrow(
        'Raw body not found. Make sure rawBody is enabled in NestJS app.',
      );
    });
  });
});
