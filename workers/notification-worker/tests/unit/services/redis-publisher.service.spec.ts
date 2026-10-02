import { Test, TestingModule } from '@nestjs/testing';
import { RedisPublisherService } from '../../../src/services/redis-publisher.service';
import { ConfigService } from '@nestjs/config';
import { NotificationMetricsService } from '../../../src/services/notification-metrics.service';
import Redis from 'ioredis';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => {
    return {
      publish: jest.fn().mockResolvedValue(1),
      disconnect: jest.fn(),
      on: jest.fn(),
    };
  });
});

describe('RedisPublisherService', () => {
  let service: RedisPublisherService;
  let configService: jest.Mocked<ConfigService>;
  let mockRedis: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisPublisherService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: NotificationMetricsService,
          useValue: { recordWsPublishLatency: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RedisPublisherService>(RedisPublisherService);
    configService = module.get(ConfigService);
    mockRedis = (Redis as any).mock.results[0].value;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publish', () => {
    it('should publish message to redis with correct channel and payload', async () => {
      configService.get.mockImplementation((key) => {
        if (key === 'notification-worker.redis.pubsubPrefix') return 'ws:';
        return 'mock-val';
      });

      const channel = 'user:1';
      const event = 'test.event';
      const data = { foo: 'bar' };

      await service.publish(channel, event, data);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'ws:user:1',
        expect.stringContaining('"event":"test.event"'),
      );
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'ws:user:1',
        expect.stringContaining('"data":{"foo":"bar"}'),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from redis', () => {
      service.onModuleDestroy();
      expect(mockRedis.disconnect).toHaveBeenCalled();
    });
  });
});
