import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { WsConnectionService } from './connection.service';
import { WsPresenceService } from './presence.service';

/** Interval (ms) to refresh presence TTL for connected users. Should be less than presence TTL. */
const HEARTBEAT_INTERVAL_MS = 25_000;

/**
 * Refreshes presence TTL in Redis for all connected users so they stay "online"
 * while the Socket.IO ping/pong keeps the connection alive.
 */
@Injectable()
export class HeartbeatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HeartbeatService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly connectionService: WsConnectionService,
    private readonly presenceService: WsPresenceService,
  ) {}

  onModuleInit() {
    this.intervalId = setInterval(() => this.refreshAllPresenceTtl(), HEARTBEAT_INTERVAL_MS);
    this.logger.log(
      `Heartbeat started: refreshing presence TTL every ${HEARTBEAT_INTERVAL_MS / 1000}s`,
    );
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.log('Heartbeat stopped');
    }
  }

  private async refreshAllPresenceTtl(): Promise<void> {
    try {
      const userIds = await this.connectionService.getAllConnectedUserIds();
      await Promise.all(userIds.map((userId) => this.presenceService.setOnline(userId)));
      if (userIds.length > 0) {
        this.logger.debug(`Refreshed presence TTL for ${userIds.length} user(s)`);
      }
    } catch (error: any) {
      this.logger.warn(`Heartbeat refresh failed: ${(error as Error).message}`);
    }
  }
}
