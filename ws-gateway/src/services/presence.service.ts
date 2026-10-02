import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '@nestlancer/cache';

@Injectable()
export class WsPresenceService {
  private readonly logger = new Logger(WsPresenceService.name);
  private readonly PRESENCE_PREFIX = 'ws:presence:';
  private readonly PRESENCE_TTL = 300; // 5 minutes

  constructor(private readonly cacheService: CacheService) {}

  async setOnline(userId: string): Promise<void> {
    try {
      await this.cacheService
        .getClient()
        .set(`${this.PRESENCE_PREFIX}${userId}`, 'online', 'EX', this.PRESENCE_TTL);
      this.logger.debug(`User ${userId} is marked online in Redis`);
    } catch (error: any) {
      this.logger.error(`Failed to set user ${userId} online`, error);
    }
  }

  async setOffline(userId: string): Promise<void> {
    try {
      await this.cacheService.getClient().del(`${this.PRESENCE_PREFIX}${userId}`);
      this.logger.debug(`User ${userId} is marked offline in Redis`);
    } catch (error: any) {
      this.logger.error(`Failed to set user ${userId} offline`, error);
    }
  }

  async getOnlineUsers(): Promise<string[]> {
    try {
      const keys = await this.cacheService.getClient().keys(`${this.PRESENCE_PREFIX}*`);
      return keys.map((key: string) => key.replace(this.PRESENCE_PREFIX, ''));
    } catch (error: any) {
      this.logger.error('Failed to get online users', error);
      return [];
    }
  }

  async isOnline(userId: string): Promise<boolean> {
    try {
      const status = await this.cacheService.getClient().get(`${this.PRESENCE_PREFIX}${userId}`);
      return status === 'online';
    } catch (error: any) {
      this.logger.error(`Failed to check if user ${userId} is online`, error);
      return false;
    }
  }
}
