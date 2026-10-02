import { Test, TestingModule } from '@nestjs/testing';
import { WsPresenceService } from '../../../src/services/presence.service';
import { CacheService } from '@nestlancer/cache';

describe('WsPresenceService', () => {
  let provider: WsPresenceService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockCacheService = {
      getClient: jest.fn().mockReturnValue({
        set: jest.fn(),
        del: jest.fn(),
        get: jest.fn(),
        keys: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WsPresenceService, { provide: CacheService, useValue: mockCacheService }],
    }).compile();

    provider = module.get<WsPresenceService>(WsPresenceService);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('setOnline', () => {
    it('should set status to online in redis', async () => {
      const userId = 'user123';
      const setSpy = jest.spyOn(cacheService.getClient(), 'set');

      await provider.setOnline(userId);

      expect(setSpy).toHaveBeenCalledWith(`ws:presence:${userId}`, 'online', 'EX', 300);
    });
  });
});
