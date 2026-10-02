import { WebhookReplayService } from '../../../src/services/webhook-replay.service';

describe('WebhookReplayService', () => {
  let service: WebhookReplayService;
  let mockPrismaRead: any;
  let mockIngestionService: any;

  const mockWebhook = {
    id: 'wh-1',
    provider: 'razorpay',
    event: 'payment.captured',
    payload: '{}',
    processedAt: null,
  };

  beforeEach(() => {
    mockPrismaRead = {
      webhookLog: { findUnique: jest.fn().mockResolvedValue(mockWebhook) },
    };
    mockIngestionService = { processStoredWebhook: jest.fn().mockResolvedValue(undefined) };
    service = new WebhookReplayService(mockPrismaRead, mockIngestionService);
  });

  describe('replay', () => {
    it('should replay a stored webhook', async () => {
      await service.replay('wh-1');
      expect(mockIngestionService.processStoredWebhook).toHaveBeenCalledWith(mockWebhook);
    });

    it('should throw for non-existent webhook', async () => {
      mockPrismaRead.webhookLog.findUnique.mockResolvedValue(null);
      await expect(service.replay('invalid')).rejects.toThrow();
    });
  });
});
