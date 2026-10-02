import { CacheHealthService } from '../../../src/services/cache-health.service';

describe('CacheHealthService', () => {
  let service: CacheHealthService;
  let mockCacheService: any;
  let mockConfigService: any;
  let mockLogger: any;

  beforeEach(() => {
    mockCacheService = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue('pong'),
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue(1000),
    };
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    service = new CacheHealthService(mockCacheService, mockConfigService, mockLogger);
  });

  describe('check', () => {
    it('should return healthy when cache read/write succeeds', async () => {
      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeDefined();
      expect(mockCacheService.set).toHaveBeenCalledWith('health:ping', 'pong', 10);
      expect(mockCacheService.get).toHaveBeenCalledWith('health:ping');
    });

    it('should return unhealthy when cache write fails', async () => {
      mockCacheService.set.mockRejectedValue(new Error('Redis connection refused'));

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Redis connection refused');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return unhealthy when cache read returns wrong value', async () => {
      mockCacheService.get.mockResolvedValue('wrong_value');

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Cache read value mismatch');
    });

    it('should return unhealthy when cache read fails', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Read timeout'));

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Read timeout');
    });

    it('should return unhealthy on cache write timeout', async () => {
      mockConfigService.get.mockReturnValue(1); // 1ms timeout
      mockCacheService.set.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Cache write timeout');
    });

    it('should include hit rate and memory usage details on success', async () => {
      const result = await service.check();
      expect(result.details).toBeDefined();
      expect(result.details.hitRate).toBeDefined();
      expect(result.details.memoryUsage).toBeDefined();
    });
  });
});
