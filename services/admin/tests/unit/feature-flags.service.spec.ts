import { FeatureFlagsService } from '../../src/services/feature-flags.service';

describe('FeatureFlagsService', () => {
  let service: FeatureFlagsService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockCacheService: any;
  let mockQueueConsumerService: any;

  beforeEach(() => {
    mockPrismaRead = {
      featureFlag: {
        findMany: jest.fn().mockResolvedValue([{ flag: 'dark_mode', enabled: true }]),
        findUnique: jest.fn().mockResolvedValue({ flag: 'dark_mode', enabled: true }),
      },
    };
    mockPrismaWrite = {
      featureFlag: {
        upsert: jest.fn().mockResolvedValue({ flag: 'dark_mode', enabled: false }),
      },
    };
    mockCacheService = { del: jest.fn().mockResolvedValue(undefined) };
    mockQueueConsumerService = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new FeatureFlagsService(
      mockPrismaWrite,
      mockPrismaRead,
      mockCacheService,
      mockQueueConsumerService,
    );
  });

  describe('findAll', () => {
    it('should return all feature flags', async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should find flag by name', async () => {
      const result = await service.findOne('dark_mode');
      expect(result.enabled).toBe(true);
    });

    it('should throw for non-existent flag', async () => {
      mockPrismaRead.featureFlag.findUnique.mockResolvedValue(null);
      await expect(service.findOne('invalid')).rejects.toThrow();
    });
  });

  describe('toggleFeature', () => {
    it('should toggle flag and invalidate cache', async () => {
      const result = await service.toggleFeature('dark_mode', false);
      expect(result.enabled).toBe(false);
      expect(mockCacheService.del).toHaveBeenCalledWith('feature_flag:dark_mode');
      expect(mockQueueConsumerService.publish).toHaveBeenCalled();
    });
  });
});
