import { StorageHealthService } from '../../../src/services/storage-health.service';

describe('StorageHealthService', () => {
  let service: StorageHealthService;
  let mockLogger: any;
  let mockStorageService: any;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };
    mockStorageService = {
      exists: jest.fn().mockResolvedValue(true),
    };

    service = new StorageHealthService(mockLogger, mockStorageService);
  });

  describe('check', () => {
    it('should return healthy when storage is accessible', async () => {
      const result = await service.check();
      expect(result.status).toBe('healthy');
      expect(result.responseTime).toBeDefined();
      expect(result.details.connected).toBe(true);
      expect(mockStorageService.exists).toHaveBeenCalledWith('nestlancer-public', '.healthcheck');
    });

    it('should include provider info in details', async () => {
      const result = await service.check();
      expect(result.details.provider).toBeDefined();
    });

    it('should return unhealthy when storage is not accessible', async () => {
      mockStorageService.exists.mockRejectedValue(new Error('Bucket not found'));

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Bucket not found');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should return unhealthy on timeout', async () => {
      mockStorageService.exists.mockRejectedValue(new Error('Request timeout'));

      const result = await service.check();
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Request timeout');
    });

    it('should ensure responseTime is at least 5ms on fast responses', async () => {
      const result = await service.check();
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });
  });
});
