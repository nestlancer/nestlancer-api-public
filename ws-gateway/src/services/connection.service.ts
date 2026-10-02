import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@nestlancer/cache';

@Injectable()
export class WsConnectionService {
  private readonly logger = new Logger(WsConnectionService.name);
  private readonly CONNECTIONS_PREFIX = 'ws:connections:';
  private readonly CONNECTIONS_TTL = 86400; // 24 hours

  constructor(private readonly cacheService: CacheService) {}

  async addConnection(userId: string, socketId: string): Promise<void> {
    try {
      await this.cacheService.getClient().sadd(`${this.CONNECTIONS_PREFIX}${userId}`, socketId);
      await this.cacheService
        .getClient()
        .expire(`${this.CONNECTIONS_PREFIX}${userId}`, this.CONNECTIONS_TTL);
      this.logger.debug(`Added connection for user ${userId}: ${socketId}`);
    } catch (error: any) {
      this.logger.error(`Failed to add connection for user ${userId}: ${socketId}`, error);
    }
  }

  async removeConnection(userId: string, socketId: string): Promise<void> {
    try {
      await this.cacheService.getClient().srem(`${this.CONNECTIONS_PREFIX}${userId}`, socketId);
      this.logger.debug(`Removed connection for user ${userId}: ${socketId}`);
    } catch (error: any) {
      this.logger.error(`Failed to remove connection for user ${userId}: ${socketId}`, error);
    }
  }

  async isOnline(userId: string): Promise<boolean> {
    try {
      const count = await this.cacheService
        .getClient()
        .scard(`${this.CONNECTIONS_PREFIX}${userId}`);
      return count > 0;
    } catch (error: any) {
      this.logger.error(`Failed to check if user ${userId} is online`, error);
      return false;
    }
  }

  async getUserConnections(userId: string): Promise<string[]> {
    try {
      return await this.cacheService.getClient().smembers(`${this.CONNECTIONS_PREFIX}${userId}`);
    } catch (error: any) {
      this.logger.error(`Failed to get connections for user ${userId}`, error);
      return [];
    }
  }

  /** Get all user IDs that have at least one active connection (for heartbeat TTL refresh) */
  async getAllConnectedUserIds(): Promise<string[]> {
    try {
      const keys = await this.cacheService.getClient().keys(`${this.CONNECTIONS_PREFIX}*`);
      return keys.map((key: string) => key.replace(this.CONNECTIONS_PREFIX, ''));
    } catch (error: any) {
      this.logger.error('Failed to get connected user IDs', error);
      return [];
    }
  }
}
