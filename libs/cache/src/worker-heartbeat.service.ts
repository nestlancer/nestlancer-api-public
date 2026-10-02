import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { CacheService } from './cache.service';

/**
 * Writes periodic Redis heartbeats for the health service worker probe.
 * Set WORKER_HEARTBEAT_NAME (e.g. emailWorker) on worker containers.
 */
@Injectable()
export class WorkerHeartbeatService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerHeartbeatService.name);
  private interval?: ReturnType<typeof setInterval>;
  private workerName?: string;

  constructor(private readonly cacheService: CacheService) {}

  onModuleInit(): void {
    this.workerName = process.env.WORKER_HEARTBEAT_NAME?.trim();
    if (!this.workerName) {
      return;
    }

    const beat = async (): Promise<void> => {
      try {
        await this.cacheService.set(
          `worker_heartbeat:${this.workerName}`,
          Date.now(),
          120,
        );
      } catch (error) {
        this.logger.warn(
          `Heartbeat failed for ${this.workerName}: ${(error as Error).message}`,
        );
      }
    };

    void beat();
    this.interval = setInterval(() => void beat(), 30_000);
    this.logger.log(`Worker heartbeat enabled (${this.workerName})`);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
