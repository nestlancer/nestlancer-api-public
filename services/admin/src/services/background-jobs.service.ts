import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { QueuePublisherService } from '@nestlancer/queue';
import { QueryJobsDto, JobStatus } from '../dto/query-jobs.dto';

@Injectable()
export class BackgroundJobsService {
  private readonly logger = new Logger(BackgroundJobsService.name);

  constructor(private readonly queueService: QueuePublisherService) {}

  async findAll(_query: QueryJobsDto) {
    // NL-BUG-SYS-001: real RabbitMQ queue introspection (depth + consumers).
    try {
      const queues = await this.queueService.inspectQueues();
      const data = queues.map((q) => ({
        id: q.name,
        name: q.name,
        type: q.name,
        status: q.messages > 0 ? JobStatus.PENDING : JobStatus.COMPLETED,
        pendingMessages: q.messages,
        consumers: q.consumers,
        createdAt: new Date(),
      }));
      return {
        data,
        total: data.length,
        source: 'rabbitmq',
        message:
          data.reduce((sum, row) => sum + row.pendingMessages, 0) === 0
            ? 'All monitored queues are idle.'
            : undefined,
      };
    } catch (err) {
      this.logger.warn(
        `Queue introspection failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return {
        data: [],
        total: 0,
        source: 'rabbitmq',
        message: 'Queue broker unreachable — job depths unavailable.',
      };
    }
  }

  async retryJob(id: string) {
    // Per-message retry is not available via Rabbit checkQueue; DLQ requeue is a later task.
    throw new ServiceUnavailableException(
      `Per-message retry for "${id}" is not supported. Re-publish via the originating service or DLQ tooling.`,
    );
  }

  async cancelJob(id: string) {
    throw new ServiceUnavailableException(
      `Per-message cancel for "${id}" is not supported on RabbitMQ depth introspection.`,
    );
  }

  async getJob(id: string) {
    try {
      const queues = await this.queueService.inspectQueues([id]);
      const q = queues[0];
      if (!q) throw new NotFoundException(`Job/queue ${id} not found`);
      return {
        id: q.name,
        name: q.name,
        type: q.name,
        status: q.messages > 0 ? JobStatus.PENDING : JobStatus.COMPLETED,
        pendingMessages: q.messages,
        consumers: q.consumers,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException(`Job/queue ${id} not found`);
    }
  }
}
