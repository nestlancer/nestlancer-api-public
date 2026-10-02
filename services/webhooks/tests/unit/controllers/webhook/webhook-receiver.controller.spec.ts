import { Test, TestingModule } from '@nestjs/testing';
import { WebhookReceiverController } from '../../../../src/controllers/webhook/webhook-receiver.controller';
import { WebhookIngestionService } from '../../../../src/services/webhook-ingestion.service';

describe('WebhookReceiverController', () => {
  let controller: WebhookReceiverController;

  const mockWebhookIngestionService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookReceiverController],
      providers: [{ provide: WebhookIngestionService, useValue: mockWebhookIngestionService }],
    }).compile();

    controller = module.get<WebhookReceiverController>(WebhookReceiverController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
