process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
process.env.JWT_ACCESS_SECRET = 'super-secret-access-token-minimum-16-chars';
process.env.JWT_REFRESH_SECRET = 'super-secret-refresh-token-minimum-16-chars';
process.env.REDIS_PUB_SUB_URL = 'redis://localhost:6379/1';

import { Test, TestingModule } from '@nestjs/testing';
import { MessagingGateway } from '../../src/gateways/messaging.gateway';
import { ProjectGateway } from '../../src/gateways/project.gateway';
import { NotificationGateway } from '../../src/gateways/notification.gateway';
import { WsConnectionService } from '../../src/services/connection.service';
import { WsPresenceService } from '../../src/services/presence.service';
import { RedisSubscriberService } from '../../src/services/redis-subscriber.service';
import { CacheService } from '@nestlancer/cache';
import { NestlancerConfigService } from '@nestlancer/config';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { Server, Socket } from 'socket.io';

describe('WsGateway Logic (Integration)', () => {
  let messagingGateway: MessagingGateway;
  let connectionService: WsConnectionService;
  let presenceService: WsPresenceService;
  let mockServer: Server;

  beforeAll(async () => {
    const mockCacheService = {
      getClient: jest.fn().mockReturnValue({
        sadd: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
        srem: jest.fn().mockResolvedValue(1),
        scard: jest.fn().mockResolvedValue(0),
        smembers: jest.fn().mockResolvedValue([]),
        set: jest.fn().mockResolvedValue('OK'),
        del: jest.fn().mockResolvedValue(1),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingGateway,
        WsConnectionService,
        WsPresenceService,
        { provide: CacheService, useValue: mockCacheService },
        {
          provide: NestlancerConfigService,
          useValue: { port: 3100, redisPubSubUrl: 'redis://localhost:6379/1' },
        },
        { provide: PrismaWriteService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
        {
          provide: RedisSubscriberService,
          useValue: { onModuleInit: jest.fn(), onModuleDestroy: jest.fn() },
        },
        NotificationGateway,
        ProjectGateway,
      ],
    }).compile();

    messagingGateway = moduleRef.get(MessagingGateway);
    connectionService = moduleRef.get(WsConnectionService);
    presenceService = moduleRef.get(WsPresenceService);

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as unknown as Server;

    messagingGateway.server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('MessagingGateway integration', () => {
    it('should handle client connection and update presence via ConnectionService/PresenceService', async () => {
      const mockClient = {
        id: 'socket-123',
        data: { user: { userId: 'user-1' } },
      } as unknown as Socket;

      const addConnectionSpy = jest.spyOn(connectionService, 'addConnection');
      const setOnlineSpy = jest.spyOn(presenceService, 'setOnline');

      await messagingGateway.handleConnection(mockClient);

      expect(addConnectionSpy).toHaveBeenCalledWith('user-1', 'socket-123');
      expect(setOnlineSpy).toHaveBeenCalledWith('user-1');
    });

    it('should handle client disconnection and set offline if no connections left', async () => {
      const mockClient = {
        id: 'socket-123',
        data: { user: { userId: 'user-1' } },
      } as unknown as Socket;

      const removeConnectionSpy = jest.spyOn(connectionService, 'removeConnection');
      jest.spyOn(connectionService, 'getUserConnections').mockResolvedValue([]);
      const setOfflineSpy = jest.spyOn(presenceService, 'setOffline');

      await messagingGateway.handleDisconnect(mockClient);

      expect(removeConnectionSpy).toHaveBeenCalledWith('user-1', 'socket-123');
      expect(setOfflineSpy).toHaveBeenCalledWith('user-1');
    });

    it('should allow user to join a project chat room', () => {
      const mockClient = {
        id: 'socket-123',
        data: { user: { userId: 'user-1' } },
        join: jest.fn(),
      } as unknown as Socket;

      const result = messagingGateway.handleJoinRoom({ projectId: 'proj-1' }, mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('chat:proj-1');
      expect(result).toEqual({ event: 'joined', data: { projectId: 'proj-1' } });
    });

    it('returns deprecation payload for message:send (use REST instead)', () => {
      const mockClient = {
        id: 'socket-123',
        data: { user: { userId: 'user-1' } },
      } as unknown as Socket;

      const result = messagingGateway.handleMessage();

      expect(result).toEqual({
        event: 'message:deprecated',
        data: {
          deprecated: true,
          use: 'POST /api/v1/messages',
        },
      });
    });

    it('should broadcast typing start to the room', () => {
      const mockClient = {
        id: 'socket-123',
        data: { user: { userId: 'user-1' } },
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      messagingGateway.handleTypingStart({ projectId: 'proj-1' }, mockClient);

      expect(mockClient.to).toHaveBeenCalledWith('chat:proj-1');
      expect(mockClient.emit).toHaveBeenCalledWith('typing:indicator', {
        userId: 'user-1',
        isTyping: true,
      });
    });

    it('should broadcast typing stop to the room', () => {
      const mockClient = {
        id: 'socket-123',
        data: { user: { userId: 'user-1' } },
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      } as unknown as Socket;

      messagingGateway.handleTypingStop({ projectId: 'proj-1' }, mockClient);

      expect(mockClient.to).toHaveBeenCalledWith('chat:proj-1');
      expect(mockClient.emit).toHaveBeenCalledWith('typing:indicator', {
        userId: 'user-1',
        isTyping: false,
      });
    });
  });
});
