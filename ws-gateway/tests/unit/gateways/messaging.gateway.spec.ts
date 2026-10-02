import { Test, TestingModule } from '@nestjs/testing';
import { MessagingGateway } from '../../../src/gateways/messaging.gateway';
import { WsConnectionService } from '../../../src/services/connection.service';
import { WsPresenceService } from '../../../src/services/presence.service';
import { WsAuthGuard } from '@nestlancer/websocket';
import { ExecutionContext } from '@nestjs/common';

describe('MessagingGateway', () => {
  let gateway: MessagingGateway;

  beforeEach(async () => {
    const mockConnectionService = {
      addConnection: jest.fn(),
      removeConnection: jest.fn(),
      getUserConnections: jest.fn().mockResolvedValue([]),
    };
    const mockPresenceService = {
      setOnline: jest.fn(),
      setOffline: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingGateway,
        { provide: WsConnectionService, useValue: mockConnectionService },
        { provide: WsPresenceService, useValue: mockPresenceService },
      ],
    })
      .overrideGuard(WsAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => true,
      })
      .compile();

    gateway = module.get<MessagingGateway>(MessagingGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConversationView', () => {
    it('should broadcast live state to chat room peers', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      const client = {
        data: { user: { userId: 'user-1' } },
        to,
      } as any;

      gateway.handleConversationView({ projectId: 'proj-1', state: 'live' }, client);

      expect(to).toHaveBeenCalledWith('chat:proj-1');
      expect(emit).toHaveBeenCalledWith(
        'conversation:view',
        expect.objectContaining({
          userId: 'user-1',
          state: 'live',
          projectId: 'proj-1',
        }),
      );
    });

    it('should broadcast waiting state to thread room peers', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      const client = {
        data: { user: { userId: 'user-2' } },
        to,
      } as any;

      gateway.handleConversationView({ threadId: 'thread-1', state: 'waiting' }, client);

      expect(to).toHaveBeenCalledWith('chat-thread:thread-1');
      expect(emit).toHaveBeenCalledWith(
        'conversation:view',
        expect.objectContaining({
          userId: 'user-2',
          state: 'waiting',
          threadId: 'thread-1',
        }),
      );
    });

    it('should broadcast closed state to chat room peers', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      const client = {
        data: { user: { userId: 'user-3' } },
        to,
      } as any;

      gateway.handleConversationView({ projectId: 'proj-2', state: 'closed' }, client);

      expect(to).toHaveBeenCalledWith('chat:proj-2');
      expect(emit).toHaveBeenCalledWith(
        'conversation:view',
        expect.objectContaining({
          userId: 'user-3',
          state: 'closed',
          projectId: 'proj-2',
        }),
      );
    });
  });
});
