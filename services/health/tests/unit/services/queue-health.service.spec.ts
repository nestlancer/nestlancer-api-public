jest.mock('amqplib', () => ({
  connect: jest.fn(),
}));

import * as amqp from 'amqplib';
import { QueueHealthService } from '../../../src/services/queue-health.service';

describe('QueueHealthService', () => {
  let service: QueueHealthService;
  let mockConfigService: any;
  let mockLogger: any;
  let mockConnection: any;
  let mockChannel: any;

  beforeEach(() => {
    mockChannel = {
      checkQueue: jest.fn().mockResolvedValue({ messageCount: 0, consumerCount: 1 }),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    };
    mockConnection = {
      createChannel: jest.fn().mockResolvedValue(mockChannel),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultVal?: any) => {
        if (key === 'RABBITMQ_URL') return 'amqp://localhost:5672';
        if (key === 'healthService.timeouts.queue') return 2000;
        return defaultVal;
      }),
    };
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    service = new QueueHealthService(mockConfigService, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('check', () => {
    it('should return healthy when RabbitMQ is reachable', async () => {
      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.details.queues).toBeDefined();
      expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost:5672');
    });

    it('should report queue statistics', async () => {
      mockChannel.checkQueue.mockResolvedValue({ messageCount: 5, consumerCount: 2 });

      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.details.pendingJobs).toBeGreaterThan(0);
      expect(result.details.workers).toBeGreaterThan(0);
    });

    it('should handle non-existent queues gracefully', async () => {
      mockChannel.checkQueue.mockRejectedValue(new Error('Queue not found'));

      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.details.pendingJobs).toBe(0);
    });

    it('should return unhealthy when connection fails', async () => {
      (amqp.connect as jest.Mock).mockRejectedValue(new Error('Connection refused'));

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Connection refused');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return unhealthy on connection timeout', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'healthService.timeouts.queue') return 1;
        if (key === 'RABBITMQ_URL') return 'amqp://localhost:5672';
        return undefined;
      });
      (amqp.connect as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Queue connection timeout');
    });

    it('should close connection even on error', async () => {
      const result = await service.check();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('should handle connection close failure gracefully', async () => {
      mockConnection.close.mockRejectedValue(new Error('Close failed'));

      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});
