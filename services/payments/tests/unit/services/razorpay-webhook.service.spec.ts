import { Test, TestingModule } from '@nestjs/testing';
import { RazorpayWebhookService } from '../../../src/services/razorpay-webhook.service';
import { RazorpayService } from '../../../src/services/razorpay.service';
import { PaymentConfirmationService } from '../../../src/services/payment-confirmation.service';

describe('RazorpayWebhookService', () => {
  let provider: RazorpayWebhookService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayWebhookService,
        { provide: RazorpayService, useValue: {} },
        { provide: PaymentConfirmationService, useValue: {} },
      ],
    }).compile();

    provider = module.get<RazorpayWebhookService>(RazorpayWebhookService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
