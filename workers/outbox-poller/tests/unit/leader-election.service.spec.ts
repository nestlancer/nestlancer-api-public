import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import Redis from 'ioredis';

import { LeaderElectionService } from '../../src/services/leader-election.service';

jest.mock('ioredis');

describe('LeaderElectionService', () => {
  let service: LeaderElectionService;
  let redis: jest.Mocked<Redis>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'REDIS_CACHE_URL') return 'redis://localhost:6379';
      if (key === 'outbox.leaderLockKey') return 'test:lock';
      if (key === 'outbox.lockTtlSeconds') return 10;
      if (key === 'outbox.instanceId') return 'instance-1';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeaderElectionService, { provide: ConfigService, useValue: mockConfigService }],
    }).compile();

    service = module.get<LeaderElectionService>(LeaderElectionService);
    redis = (service as any).redis;
  });

  it('should acquire lock if not held', async () => {
    redis.set.mockResolvedValue('OK');

    const result = await service.acquireLock();

    expect(result).toBe(true);
    expect(redis.set).toHaveBeenCalledWith('test:lock', 'instance-1', 'EX', 10, 'NX');
  });

  it('should renew lock if already held by this instance', async () => {
    redis.set.mockResolvedValue(null);
    redis.get.mockResolvedValue('instance-1');
    redis.expire.mockResolvedValue(1);

    const result = await service.acquireLock();

    expect(result).toBe(true);
    expect(redis.expire).toHaveBeenCalledWith('test:lock', 10);
  });

  it('should fail to acquire lock if held by another instance', async () => {
    redis.set.mockResolvedValue(null);
    redis.get.mockResolvedValue('instance-2');

    const result = await service.acquireLock();

    expect(result).toBe(false);
  });

  it('should release lock on application shutdown', async () => {
    redis.get.mockResolvedValue('instance-1');
    redis.del.mockResolvedValue(1);

    await service.onApplicationShutdown();

    expect(redis.get).toHaveBeenCalledWith('test:lock');
    expect(redis.del).toHaveBeenCalledWith('test:lock');
  });
});
