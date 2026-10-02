import { SystemConfigService } from '../../src/services/system-config.service';

describe('SystemConfigService', () => {
  let service: SystemConfigService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockCacheService: any;

  beforeEach(() => {
    mockPrismaRead = {
      systemConfig: {
        findUnique: jest.fn().mockResolvedValue({ key: 'site_name', value: 'Nestlancer' }),
        findMany: jest.fn().mockResolvedValue([
          { key: 'site_name', value: 'Nestlancer' },
          { key: 'max_upload', value: 10 },
        ]),
      },
    };
    mockPrismaWrite = {
      systemConfig: { upsert: jest.fn().mockResolvedValue({ key: 'site_name', value: 'Updated' }) },
    };
    mockCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };
    service = new SystemConfigService(mockPrismaWrite, mockPrismaRead, mockCacheService);
  });

  describe('get', () => {
    it('should return config value from DB', async () => {
      const result = await service.get('site_name');
      expect(result).toBe('Nestlancer');
    });

    it('should return cached value if available', async () => {
      mockCacheService.get.mockResolvedValue('CachedValue');
      const result = await service.get('site_name');
      expect(result).toBe('CachedValue');
      expect(mockPrismaRead.systemConfig.findUnique).not.toHaveBeenCalled();
    });

    it('should throw for non-existent key', async () => {
      mockPrismaRead.systemConfig.findUnique.mockResolvedValue(null);
      await expect(service.get('invalid')).rejects.toThrow();
    });
  });

  describe('set', () => {
    it('should upsert config and invalidate cache', async () => {
      const result = await service.set({ key: 'site_name', value: 'Updated' } as any, 'admin-1');
      expect(mockCacheService.del).toHaveBeenCalledWith('system_config:site_name');
    });
  });

  describe('getAll', () => {
    it('should return all configs as key-value map', async () => {
      const result = await service.getAll();
      expect(result.site_name).toBe('Nestlancer');
      expect(result.max_upload).toBe(10);
    });
  });
});
