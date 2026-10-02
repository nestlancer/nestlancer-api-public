import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

import { PrismaWriteService } from '@nestlancer/database';
import { MetricsService } from '@nestlancer/metrics';

import { OutboxEventStatus } from '../interfaces/outbox-event.interface';

@Injectable()
export class StaleEventMonitorService implements OnModuleInit {
  private readonly logger = new Logger(StaleEventMonitorService.name);
  private readonly staleThresholdMinutes: number;

  constructor(
    private readonly prisma: PrismaWriteService,
    private readonly configService: ConfigService,
    private readonly metrics: MetricsService,
  ) {
    this.staleThresholdMinutes =
      this.configService.get<number>('outbox.staleThresholdMinutes') ?? 60;
  }

  onModuleInit(): void {
    this.metrics.createGauge(
      'outbox_stale_events_total',
      'Current number of outbox events pending longer than stale threshold',
    );
    this.metrics.createCounter(
      'outbox_stale_events_detected_total',
      'Number of times stale events were detected (for alerting)',
    );
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  async checkStaleEvents(): Promise<void> {
    this.logger.debug('Checking for stale outbox events');

    const staleDate = new Date();
    staleDate.setMinutes(staleDate.getMinutes() - this.staleThresholdMinutes);

    const staleCount = await this.prisma.outbox.count({
      where: {
        status: OutboxEventStatus.PENDING,
        createdAt: { lt: staleDate },
      },
    });

    this.metrics.setGauge('outbox_stale_events_total', staleCount);

    if (staleCount > 0) {
      this.metrics.incrementCounter('outbox_stale_events_detected_total');
      this.logger.warn(
        `Found ${staleCount} stale outbox events (older than ${this.staleThresholdMinutes} min)`,
      );
    }
  }
}
