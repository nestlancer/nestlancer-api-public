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
import { PrismaReadService } from '@nestlancer/database';
import { WsConnectionService } from '../services/connection.service';
import { resolveSocketCorsOrigin } from '../utils/ws-cors';
import { logSocketLifecycle, runWithSocketLogContext } from '../utils/ws-socket-log';

@WebSocketGateway({
  namespace: '/projects',
  cors: {
    origin: resolveSocketCorsOrigin(),
    credentials: true,
  },
})
@UseGuards(WsAuthGuard)
export class ProjectGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ProjectGateway.name);

  constructor(
    private readonly connectionService: WsConnectionService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      await runWithSocketLogContext(client, async () => {
        attachAuthenticatedWsUser(client);
        const userId = client.data?.user?.userId;
        if (userId) {
          await this.connectionService.addConnection(userId, client.id);
        }
        logSocketLifecycle('ws.connect', client, '/projects');
      });
    } catch (error: any) {
      logSocketLifecycle('ws.auth_failed', client, '/projects', 'error', error);
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      await runWithSocketLogContext(client, async () => {
        const userId = client.data?.user?.userId;
        if (userId) {
          await this.connectionService.removeConnection(userId, client.id);
        }
        logSocketLifecycle('ws.disconnect', client, '/projects');
      });
    } catch (error: any) {
      this.logger.error(`Error handling disconnection for client ${client.id}`, error);
    }
  }

  @SubscribeMessage('subscribe:project')
  handleSubscribe(@MessageBody() data: { projectId: string }, @ConnectedSocket() client: Socket) {
    return runWithSocketLogContext(client, () => {
      try {
        if (!data?.projectId) throw new WsException('Missing projectId');
        client.join(`project:${data.projectId}`);
        this.logger.debug(`Client ${client.id} joined project room: ${data.projectId}`);
        return { event: 'subscribed', data: { projectId: data.projectId } };
      } catch (error: any) {
        this.logger.error(`Error subscribing to project`, error);
        throw new WsException('Internal server error');
      }
    });
  }

  @SubscribeMessage('progress:update')
  async handleProgressUpdate(
    @MessageBody() data: { projectId: string; progress: number },
    @ConnectedSocket() client: Socket,
  ) {
    return runWithSocketLogContext(client, async () => {
      try {
        if (!data?.projectId || data?.progress === undefined)
          throw new WsException('Invalid payload');
        const userId: string = client.data?.userId;
        if (userId) {
          const project = await this.prismaRead.project.findFirst({
            where: {
              id: data.projectId,
              OR: [{ clientId: userId }, { adminId: userId }],
            },
            select: { id: true },
          });
          if (!project) {
            throw new WsException('Not authorized to update this project');
          }
        }
        this.server.to(`project:${data.projectId}`).emit('progress:updated', data);
        this.logger.debug(`Progress update emitted for project: ${data.projectId}`);
      } catch (error: any) {
        this.logger.error(`Error handling progress update`, error);
        throw new WsException('Internal server error');
      }
    });
  }
}
