import { WebhookDispatcherService } from '../../../src/services/webhook-dispatcher.service';

describe('WebhookDispatcherService', () => {
  let service: WebhookDispatcherService;
  let mockQueueConsumerService: any;

  beforeEach(() => {
    mockQueueConsumerService = { sendToQueue: jest.fn().mockResolvedValue(undefined) };
    service = new WebhookDispatcherService(mockQueueConsumerService);
  });

  describe('dispatch', () => {
    const mockEvent = {
      provider: 'razorpay',
      eventType: 'payment.captured',
      eventId: 'evt-1',
      timestamp: new Date(),
      targetQueue: 'payments-queue',
      data: { paymentId: 'pay-1' },
    };

    it('should dispatch event to target queue', async () => {
      const result = await service.dispatch(mockEvent as any, 'raw-1');
      expect(result).toBe(true);
      expect(mockQueueConsumerService.sendToQueue).toHaveBeenCalledWith(
        'payments-queue',
        expect.objectContaining({ eventId: 'evt-1' }),
      );
    });

    it('should return false when no target queue defined', async () => {
      const result = await service.dispatch(
        { ...mockEvent, targetQueue: undefined } as any,
        'raw-1',
      );
      expect(result).toBe(false);
    });

    it('should throw when queue dispatch fails', async () => {
      mockQueueConsumerService.sendToQueue.mockRejectedValue(new Error('Queue down'));
      await expect(service.dispatch(mockEvent as any, 'raw-1')).rejects.toThrow();
    });
  });
});
