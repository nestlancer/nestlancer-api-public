process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
process.env.JWT_ACCESS_SECRET = 'super-secret-access-token-minimum-16-chars';
process.env.JWT_REFRESH_SECRET = 'super-secret-refresh-token-minimum-16-chars';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WsAppModule } from '../../src/app.module';
import { CacheService } from '@nestlancer/cache';
import { NestlancerConfigService } from '@nestlancer/config';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { WsConnectionService } from '../../src/services/connection.service';
import { WsPresenceService } from '../../src/services/presence.service';
import { RedisSubscriberService } from '../../src/services/redis-subscriber.service';
import { MessagingGateway } from '../../src/gateways/messaging.gateway';
import { NotificationGateway } from '../../src/gateways/notification.gateway';
import { ProjectGateway } from '../../src/gateways/project.gateway';

describe('WsAppModule (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockCacheService = {
      getClient: jest.fn().mockReturnValue({
        on: jest.fn(),
        quit: jest.fn(),
        sadd: jest.fn(),
        expire: jest.fn(),
        srem: jest.fn(),
        scard: jest.fn(),
        smembers: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        get: jest.fn(),
        keys: jest.fn(),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [WsAppModule],
    })
      .overrideProvider(CacheService)
      .useValue(mockCacheService)
      .overrideProvider(PrismaWriteService)
      .useValue({})
      .overrideProvider(PrismaReadService)
      .useValue({})
      .overrideProvider(NestlancerConfigService)
      .useValue({
        port: 3100,
      })
      .overrideProvider(RedisSubscriberService)
      .useValue({
        onModuleInit: jest.fn(),
        onModuleDestroy: jest.fn(),
        subscribeMessagingChatChannel: jest.fn(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should initialize the WebSocket gateway application successfully', () => {
    expect(app).toBeDefined();
  });

  it('should resolve WsAppModule dependencies correctly', () => {
    const appModule = app.get(WsAppModule);
    expect(appModule).toBeDefined();
  });

  it('should resolve CacheService as a global provider', () => {
    const cacheService = app.get(CacheService);
    expect(cacheService).toBeDefined();
    expect(typeof cacheService.getClient).toBe('function');
  });

  it('should resolve NestlancerConfigService properly', () => {
    const configService = app.get(NestlancerConfigService);
    expect(configService).toBeDefined();
  });

  it('should provide Prisma services for potential database access', () => {
    const writeService = app.get(PrismaWriteService);
    const readService = app.get(PrismaReadService);
    expect(writeService).toBeDefined();
    expect(readService).toBeDefined();
  });

  describe('Gateways Initialization', () => {
    it('should resolve MessagingGateway', () => {
      const messagingGateway = app.get(MessagingGateway);
      expect(messagingGateway).toBeDefined();
    });

    it('should resolve NotificationGateway', () => {
      const notificationGateway = app.get(NotificationGateway);
      expect(notificationGateway).toBeDefined();
    });

    it('should resolve ProjectGateway', () => {
      const projectGateway = app.get(ProjectGateway);
      expect(projectGateway).toBeDefined();
    });
  });

  describe('Services Logic', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve WsConnectionService and interact with CacheService', async () => {
      const connectionService = app.get(WsConnectionService);
      expect(connectionService).toBeDefined();

      const cacheService = app.get(CacheService);
      const mockRedisClient = cacheService.getClient();

      await connectionService.addConnection('test-user-1', 'socket-abc');
      expect(mockRedisClient.sadd).toHaveBeenCalledWith('ws:connections:test-user-1', 'socket-abc');
      expect(mockRedisClient.expire).toHaveBeenCalledWith('ws:connections:test-user-1', 86400);

      await connectionService.removeConnection('test-user-1', 'socket-abc');
      expect(mockRedisClient.srem).toHaveBeenCalledWith('ws:connections:test-user-1', 'socket-abc');

      (mockRedisClient.scard as jest.Mock).mockResolvedValue(1);
      const isOnline = await connectionService.isOnline('test-user-1');
      expect(mockRedisClient.scard).toHaveBeenCalledWith('ws:connections:test-user-1');
      expect(isOnline).toBe(true);
    });

    it('should resolve WsPresenceService and interact with CacheService', async () => {
      const presenceService = app.get(WsPresenceService);
      expect(presenceService).toBeDefined();

      const cacheService = app.get(CacheService);
      const mockRedisClient = cacheService.getClient();

      await presenceService.setOnline('test-user-1');
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'ws:presence:test-user-1',
        'online',
        'EX',
        300,
      );

      await presenceService.setOffline('test-user-1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('ws:presence:test-user-1');
    });

    it('should resolve RedisSubscriberService', () => {
      const redisSubscriberService = app.get(RedisSubscriberService);
      expect(redisSubscriberService).toBeDefined();
    });
  });
});
