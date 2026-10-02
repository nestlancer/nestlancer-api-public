import { Test, TestingModule } from '@nestjs/testing';
import { CacheManagementService } from '../../../src/services/cache-management.service';
import { CacheService } from '@nestlancer/cache';
import { ClearCacheDto } from '../../../src/dto/clear-cache.dto';

describe('CacheManagementService', () => {
  let service: CacheManagementService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockClient = {
      flushdb: jest.fn().mockResolvedValue('OK'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheManagementService,
        {
          provide: CacheService,
          useValue: {
            del: jest.fn(),
            getClient: jest.fn().mockReturnValue(mockClient),
          },
        },
      ],
    }).compile();

    service = module.get<CacheManagementService>(CacheManagementService);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('clearCache', () => {
    it('should clear specific pattern if provide', async () => {
      const dto: ClearCacheDto = { keyPattern: 'user:*' };
      const result = await service.clearCache(dto);

      expect(cacheService.del).toHaveBeenCalledWith('user:*');
      expect(result).toEqual({ message: 'Cleared cache matching pattern: user:*' });
    });

    it('should flushdb if pattern not provided', async () => {
      const mockClient = cacheService.getClient();
      const dto: ClearCacheDto = {};
      const result = await service.clearCache(dto);

      expect(mockClient.flushdb).toHaveBeenCalled();
      expect(result).toEqual({ message: 'All caches cleared successfully' });
    });
  });
});
