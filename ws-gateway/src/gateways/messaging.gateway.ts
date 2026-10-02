import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { WsAuthGuard, attachAuthenticatedWsUser } from '@nestlancer/websocket';
import { WsConnectionService } from '../services/connection.service';
import { WsPresenceService } from '../services/presence.service';
import { resolveSocketCorsOrigin } from '../utils/ws-cors';
import { logSocketLifecycle, runWithSocketLogContext } from '../utils/ws-socket-log';

@WebSocketGateway({
  namespace: '/messages',
  cors: {
    origin: resolveSocketCorsOrigin(),
    credentials: true,
  },
})
@UseGuards(WsAuthGuard)
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MessagingGateway.name);

  constructor(
    private readonly connectionService: WsConnectionService,
    private readonly presenceService: WsPresenceService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      await runWithSocketLogContext(client, async () => {
        attachAuthenticatedWsUser(client);
        const userId = client.data?.user?.userId;
        if (userId) {
          await this.connectionService.addConnection(userId, client.id);
          await this.presenceService.setOnline(userId);
        }
        logSocketLifecycle('ws.connect', client, '/messages');
      });
    } catch {
      logSocketLifecycle('ws.auth_failed', client, '/messages', 'warn');
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      await runWithSocketLogContext(client, async () => {
        const userId = client.data?.user?.userId;
        if (userId) {
          await this.connectionService.removeConnection(userId, client.id);
          const connections = await this.connectionService.getUserConnections(userId);
          if (connections.length === 0) {
            await this.presenceService.setOffline(userId);
          }
        }
        logSocketLifecycle('ws.disconnect', client, '/messages');
      });
    } catch (error: any) {
      this.logger.error(`Error handling disconnection for client ${client.id}`, error);
    }
  }

  @SubscribeMessage('join:room')
  handleJoinRoom(
    @MessageBody() data: { projectId?: string; threadId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    return runWithSocketLogContext(client, () => {
      try {
        if (data?.projectId) {
          client.join(`chat:${data.projectId}`);
          this.logger.debug(`User ${client.data?.user?.userId} joined chat room: ${data.projectId}`);
          return { event: 'joined', data };
        }
        if (data?.threadId) {
          client.join(`chat-thread:${data.threadId}`);
          this.logger.debug(`User ${client.data?.user?.userId} joined thread room: ${data.threadId}`);
          return { event: 'joined', data };
        }
        throw new WsException('Missing projectId or threadId');
      } catch (error: any) {
        this.logger.error(`Error joining room`, error);
        throw new WsException('Internal server error');
      }
    });
  }

  /**
   * @deprecated Use the REST endpoint POST /api/v1/messages/project/:projectId (or /messages)
   * to send messages. Persistence is handled by the messaging microservice which then
   * fans out the `message:new` WS event via Redis pub/sub → emitRealtimeMessageFromRest().
   */
  @SubscribeMessage('message:send')
  handleMessage() {
    return {
      event: 'message:deprecated',
      data: {
        deprecated: true,
        use: 'POST /api/v1/messages',
      },
    };
  }

  /**
   * Broadcasts a message that was persisted via REST (messaging microservice → Redis → here).
   * Shape matches `message:send` fan-out so clients can reuse the same `message:new` handler.
   */
  emitRealtimeMessageFromRest(payload: {
    projectId: string | null;
    threadId: string | null;
    id: string;
    senderId: string;
    content: string;
    type: string;
    createdAt: string;
  }): void {
    if (!this.server) {
      this.logger.warn('Socket server not ready; skipping chat broadcast');
      return;
    }
    const message = {
      id: payload.id,
      senderId: payload.senderId,
      content: payload.content,
      type: payload.type,
      createdAt: payload.createdAt,
      projectId: payload.projectId,
      threadId: payload.threadId,
    };
    if (payload.projectId) {
      this.server.to(`chat:${payload.projectId}`).emit('message:new', message);
    } else if (payload.threadId) {
      this.server.to(`chat-thread:${payload.threadId}`).emit('message:new', message);
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @MessageBody() data: { projectId?: string; threadId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    return runWithSocketLogContext(client, () => {
      try {
        const userId = client.data?.user?.userId;
        if (data?.projectId) {
          client.to(`chat:${data.projectId}`).emit('typing:indicator', { userId, isTyping: true });
        } else if (data?.threadId) {
          client
            .to(`chat-thread:${data.threadId}`)
            .emit('typing:indicator', { userId, isTyping: true });
        } else {
          throw new WsException('Missing projectId or threadId');
        }
      } catch (error: any) {
        this.logger.error(`Error handling typing start`, error);
      }
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @MessageBody() data: { projectId?: string; threadId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    return runWithSocketLogContext(client, () => {
      try {
        const userId = client.data?.user?.userId;
        if (data?.projectId) {
          client.to(`chat:${data.projectId}`).emit('typing:indicator', { userId, isTyping: false });
        } else if (data?.threadId) {
          client
            .to(`chat-thread:${data.threadId}`)
            .emit('typing:indicator', { userId, isTyping: false });
        } else {
          throw new WsException('Missing projectId or threadId');
        }
      } catch (error: any) {
        this.logger.error(`Error handling typing stop`, error);
      }
    });
  }

  /** Broadcasts popup state: live (open), waiting (minimized), or closed (dismissed). */
  @SubscribeMessage('conversation:view')
  handleConversationView(
    @MessageBody()
    data: { projectId?: string; threadId?: string; state: 'live' | 'waiting' | 'closed' },
    @ConnectedSocket() client: Socket,
  ) {
    return runWithSocketLogContext(client, () => {
      try {
        const userId = client.data?.user?.userId;
        if (!userId) return;
        if (data?.state !== 'live' && data?.state !== 'waiting' && data?.state !== 'closed') {
          throw new WsException('Invalid view state');
        }

        const payload = {
          userId,
          state: data.state,
          projectId: data.projectId ?? null,
          threadId: data.threadId ?? null,
          at: new Date().toISOString(),
        };

        if (data.projectId) {
          client.to(`chat:${data.projectId}`).emit('conversation:view', payload);
        } else if (data.threadId) {
          client.to(`chat-thread:${data.threadId}`).emit('conversation:view', payload);
        } else {
          throw new WsException('Missing projectId or threadId');
        }
      } catch (error: any) {
        this.logger.error(`Error handling conversation view`, error);
      }
    });
  }
}
