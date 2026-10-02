import { Test, TestingModule } from '@nestjs/testing';
import { WsConnectionService } from '../../../src/services/connection.service';
import { CacheService } from '@nestlancer/cache';

describe('WsConnectionService', () => {
  let provider: WsConnectionService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const mockCacheService = {
      getClient: jest.fn().mockReturnValue({
        sadd: jest.fn(),
        expire: jest.fn(),
        srem: jest.fn(),
        scard: jest.fn(),
        smembers: jest.fn(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [WsConnectionService, { provide: CacheService, useValue: mockCacheService }],
    }).compile();

    provider = module.get<WsConnectionService>(WsConnectionService);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('addConnection', () => {
    it('should add connection to redis set', async () => {
      const userId = 'user123';
      const socketId = 'socket456';
      const saddSpy = jest.spyOn(cacheService.getClient(), 'sadd');

      await provider.addConnection(userId, socketId);

      expect(saddSpy).toHaveBeenCalledWith(`ws:connections:${userId}`, socketId);
    });
  });
});
