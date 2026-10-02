import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@nestlancer/logger';
import { HealthCheckResult } from '../interfaces/health-check-result.interface';
import * as amqp from 'amqplib';

interface QueueStats {
  pendingJobs: number;
  consumers: number;
  queues: Array<{
    name: string;
    messages: number;
    consumers: number;
  }>;
}

@Injectable()
export class QueueHealthService {
  /** Must match real worker queue names (`QUEUE_*` in @nestlancer/common). */
  private readonly MONITORED_QUEUES = [
    'email.queue',
    'notification.queue',
    'audit.queue',
    'media.queue',
    'webhook.queue',
    'cdn.queue',
    'analytics.queue',
    'document.queue',
    'export.queue',
  ];

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let connection: any = null;

    try {
      const timeoutMs = this.configService.get<number>('healthService.timeouts.queue') || 2000;
      const rabbitUrl = this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost:5672');

      // Attempt to connect with timeout
      connection = await Promise.race([
        amqp.connect(rabbitUrl),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Queue connection timeout')), timeoutMs),
        ),
      ]);

      // Get queue statistics
      const queueStats = await this.getQueueStats(connection);
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          pendingJobs: queueStats.pendingJobs,
          workers: queueStats.consumers,
          queues: queueStats.queues,
        },
      };
    } catch (error: any) {
      this.logger.error('Queue health check failed', error.stack, 'QueueHealthService');
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (closeError) {
          this.logger.warn('Failed to close RabbitMQ connection', 'QueueHealthService');
        }
      }
    }
  }

  private async asyncCheckQueue(
    connection: any,
    queueName: string,
  ): Promise<{ messages: number; consumers: number }> {
    const channel = await connection.createChannel();
    // Add error listener to prevent unhandled exceptions if channel closes
    channel.on('error', () => {
      /* Silently ignore channel closing on 404 */
    });

    try {
      const queueInfo = await channel.checkQueue(queueName);
      return {
        messages: queueInfo.messageCount,
        consumers: queueInfo.consumerCount,
      };
    } catch (error) {
      // Queue doesn't exist or other channel error
      return { messages: 0, consumers: 0 };
    } finally {
      try {
        await channel.close();
      } catch (e) {
        // Ignore errors on closing an already closed channel
      }
    }
  }

  private async getQueueStats(connection: any): Promise<QueueStats> {
    const queues: QueueStats['queues'] = [];
    let totalPendingJobs = 0;
    let totalConsumers = 0;

    for (const queueName of this.MONITORED_QUEUES) {
      const queueInfo = await this.asyncCheckQueue(connection, queueName);
      queues.push({
        name: queueName,
        messages: queueInfo.messages,
        consumers: queueInfo.consumers,
      });
      totalPendingJobs += queueInfo.messages;
      totalConsumers += queueInfo.consumers;
    }

    return {
      pendingJobs: totalPendingJobs,
      consumers: totalConsumers,
      queues,
    };
  }
}
