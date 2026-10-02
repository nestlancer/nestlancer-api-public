import { WorkersHealthService } from '../../../src/services/workers-health.service';

describe('WorkersHealthService', () => {
  let service: WorkersHealthService;
  let mockCacheService: any;

  beforeEach(() => {
    mockCacheService = {
      get: jest.fn(),
    };
    service = new WorkersHealthService(mockCacheService);
  });

  describe('check', () => {
    it('should return healthy when all workers have recent heartbeats', async () => {
      const now = Date.now();
      mockCacheService.get.mockResolvedValue(String(now - 5000)); // 5s ago

      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.details.activeWorkers).toBe(10);
    });

    it('should return degraded when some workers have stale heartbeats', async () => {
      const now = Date.now();
      mockCacheService.get
        .mockResolvedValueOnce(String(now - 5000)) // healthy
        .mockResolvedValueOnce(String(now - 120000)) // stale (>60s)
        .mockResolvedValueOnce(String(now - 5000)); // healthy

      const result = await service.check();
      expect(result.status).toBe('degraded');
      expect(result.details.activeWorkers).toBe(10);
    });

    it('should return degraded when workers have no heartbeat', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.check();
      expect(result.status).toBe('degraded');
      expect(result.details.activeWorkers).toBe(0);
      expect(result.details.emailWorker).toBe('unknown');
      expect(result.details.notificationWorker).toBe('unknown');
      expect(result.details.outboxPoller).toBe('unknown');
      expect(result.details.analyticsWorker).toBe('unknown');
    });

    it('should return unhealthy when cache service fails', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Redis unavailable'));

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Redis unavailable');
    });

    it('should check all ten workers', async () => {
      const now = Date.now();
      mockCacheService.get.mockResolvedValue(String(now));

      await service.check();
      expect(mockCacheService.get).toHaveBeenCalledWith('worker_heartbeat:emailWorker');
      expect(mockCacheService.get).toHaveBeenCalledWith('worker_heartbeat:notificationWorker');
      expect(mockCacheService.get).toHaveBeenCalledWith('worker_heartbeat:outboxPoller');
      expect(mockCacheService.get).toHaveBeenCalledWith('worker_heartbeat:analyticsWorker');
      expect(mockCacheService.get).toHaveBeenCalledWith('worker_heartbeat:webhookWorker');
    });
  });
});
