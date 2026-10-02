import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import Redis from 'ioredis';

import { LeaderElectionService } from '../../../src/services/leader-election.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      set: jest.fn(),
      get: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
    };
  });
});

describe('LeaderElectionService', () => {
  let service: LeaderElectionService;
  let mockRedisInstance: jest.Mocked<Redis>;

  beforeEach(async () => {
    // Clear mock calls to ioredis constructor to grab latest instance
    (Redis as unknown as jest.Mock).mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderElectionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'REDIS_CACHE_URL') return 'redis://localhost:6379';
              if (key === 'outbox.instanceId') return 'instance-abc';
              return null; // keep defaults for others
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LeaderElectionService>(LeaderElectionService);
    mockRedisInstance = (Redis as unknown as jest.Mock).mock.results[0].value;

    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('acquireLock', () => {
    it('should return true if lock acquired successfully', async () => {
      // SET key value EX ttl NX
      mockRedisInstance.set.mockResolvedValue('OK');

      const result = await service.acquireLock();
      expect(result).toBe(true);
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'outbox:lock',
        'instance-abc',
        'EX',
        10,
        'NX',
      );
    });

    it('should return true if already holding the lock and renew ttl', async () => {
      mockRedisInstance.set.mockResolvedValue(null); // NX failed
      mockRedisInstance.get.mockResolvedValue('instance-abc'); // verify ownership

      const result = await service.acquireLock();
      expect(result).toBe(true);
      expect(mockRedisInstance.expire).toHaveBeenCalledWith('outbox:lock', 10);
    });

    it('should return false if lock held by another instance', async () => {
      mockRedisInstance.set.mockResolvedValue(null);
      mockRedisInstance.get.mockResolvedValue('instance-def');

      const result = await service.acquireLock();
      expect(result).toBe(false);
      expect(mockRedisInstance.expire).not.toHaveBeenCalled();
    });

    it('should handle redis errors', async () => {
      mockRedisInstance.set.mockRejectedValue(new Error('Redis connection error'));
      const result = await service.acquireLock();
      expect(result).toBe(false);
    });
  });

  describe('releaseLock', () => {
    it('should delete key if holding the lock', async () => {
      mockRedisInstance.get.mockResolvedValue('instance-abc');
      await service.releaseLock();
      expect(mockRedisInstance.del).toHaveBeenCalledWith('outbox:lock');
    });

    it('should not delete key if not held by current instance', async () => {
      mockRedisInstance.get.mockResolvedValue('instance-def');
      await service.releaseLock();
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });
  });

  describe('isLeader', () => {
    it('should return true if val matches instanceId', async () => {
      mockRedisInstance.get.mockResolvedValue('instance-abc');
      const result = await service.isLeader();
      expect(result).toBe(true);
    });

    it('should return false if val does not match', async () => {
      mockRedisInstance.get.mockResolvedValue('instance-def');
      const result = await service.isLeader();
      expect(result).toBe(false);
    });
  });
});
