import { Test, TestingModule } from '@nestjs/testing';
import { WebhookReceiverController } from '../../../src/controllers/webhook/webhook-receiver.controller';
import { WebhookIngestionService } from '../../../src/services/webhook-ingestion.service';
import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';

describe('WebhookReceiverController', () => {
  let controller: WebhookReceiverController;
  let ingestionService: jest.Mocked<WebhookIngestionService>;

  beforeEach(async () => {
    const mockIngestionService = {
      handleIncoming: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookReceiverController],
      providers: [
        {
          provide: WebhookIngestionService,
          useValue: mockIngestionService,
        },
      ],
    }).compile();

    controller = module.get<WebhookReceiverController>(WebhookReceiverController);
    ingestionService = module.get(WebhookIngestionService) as any;
  });

  it('should process razorpay webhook', async () => {
    const rawBody = Buffer.from('{"event":"payment.captured"}');
    const headers = { 'x-razorpay-signature': 'test-sig' };
    const req = { rawBody } as unknown as RawBodyRequest<Request>;

    await controller.handleRazorpay(headers, req);

    expect(ingestionService.handleIncoming).toHaveBeenCalledWith('razorpay', rawBody, headers);
  });

  it('should process cloudflare webhook', async () => {
    const rawBody = Buffer.from('{"type":"cache.purge"}');
    const headers = { 'cf-webhook-auth': 'test-secret' };
    const req = { rawBody } as unknown as RawBodyRequest<Request>;

    await controller.handleCloudflare(headers, req);

    expect(ingestionService.handleIncoming).toHaveBeenCalledWith('cloudflare', rawBody, headers);
  });
});
