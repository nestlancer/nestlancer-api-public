import { Test, TestingModule } from '@nestjs/testing';
import { WebhookTestingService } from '../../../src/services/webhook-testing.service';
import { WebhooksManagementService } from '../../../src/services/webhooks-management.service';
import { QueuePublisherService } from '@nestlancer/queue';
import { TestWebhookDto } from '../../../src/dto/test-webhook.dto';
import { BadRequestException } from '@nestjs/common';

describe('WebhookTestingService', () => {
  let service: WebhookTestingService;
  let webhooksService: jest.Mocked<WebhooksManagementService>;
  let queueService: jest.Mocked<QueuePublisherService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookTestingService,
        {
          provide: WebhooksManagementService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: QueuePublisherService,
          useValue: {
            publish: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookTestingService>(WebhookTestingService);
    webhooksService = module.get(WebhooksManagementService);
    queueService = module.get(QueuePublisherService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('testDelivery', () => {
    it('should throw BadRequestException if event is not subscribed', async () => {
      webhooksService.findOne.mockResolvedValue({ id: 'wh-1', events: ['foo'] } as any);

      const dto: TestWebhookDto = { event: 'bar' };
      await expect(service.testDelivery('wh-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should publish a test payload if subscribed', async () => {
      webhooksService.findOne.mockResolvedValue({ id: 'wh-1', events: ['bar'] } as any);
      queueService.publish.mockResolvedValue(undefined as any);

      const dto: TestWebhookDto = { event: 'bar' };
      const result = await service.testDelivery('wh-1', dto);

      expect(queueService.publish).toHaveBeenCalledWith(
        'admin',
        'WEBHOOK_DISPATCH',
        expect.objectContaining({
          webhookId: 'wh-1',
          event: 'bar',
          isTest: true,
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should publish a test payload if wildcard subscribed', async () => {
      webhooksService.findOne.mockResolvedValue({ id: 'wh-1', events: ['*'] } as any);
      queueService.publish.mockResolvedValue(undefined as any);

      const dto: TestWebhookDto = { event: 'bar' };
      const result = await service.testDelivery('wh-1', dto);

      expect(queueService.publish).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });
});
