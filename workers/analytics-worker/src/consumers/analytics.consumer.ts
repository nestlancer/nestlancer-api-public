import { Injectable, OnModuleInit } from '@nestjs/common';

import { ConsumeMessage } from 'amqplib';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CacheService } from '@nestlancer/cache';
import { LoggerService } from '@nestlancer/logger';
import { QueueConsumerService, DlqService } from '@nestlancer/queue';

import { AnalyticsJobDto } from '../dto/analytics-job.dto';
import { AnalyticsJobType } from '../interfaces/analytics-job.interface';
import { BlogAnalyticsProcessor } from '../processors/blog-analytics.processor';
import { EngagementAnalyticsProcessor } from '../processors/engagement-analytics.processor';
import { PortfolioAnalyticsProcessor } from '../processors/portfolio-analytics.processor';
import { ProjectAnalyticsProcessor } from '../processors/project-analytics.processor';
import { RevenueAnalyticsProcessor } from '../processors/revenue-analytics.processor';
import { UserAnalyticsProcessor } from '../processors/user-analytics.processor';

/**
 * RabbitMQ consumer for analytics processing jobs.
 * Orchestrates the dispatch of processing tasks to specialized analytics processors.
 * Includes validation, idempotency checks, and DLQ support.
 */
@Injectable()
export class AnalyticsConsumer implements OnModuleInit {
  private readonly QUEUE_NAME = 'analytics.queue';
  private readonly LOCK_TTL = 3600; // 1 hour

  constructor(
    private readonly logger: LoggerService,
    private readonly queueConsumer: QueueConsumerService,
    private readonly dlqService: DlqService,
    private readonly cache: CacheService,
    private readonly userAnalytics: UserAnalyticsProcessor,
    private readonly projectAnalytics: ProjectAnalyticsProcessor,
    private readonly revenueAnalytics: RevenueAnalyticsProcessor,
    private readonly portfolioAnalytics: PortfolioAnalyticsProcessor,
    private readonly blogAnalytics: BlogAnalyticsProcessor,
    private readonly engagementAnalytics: EngagementAnalyticsProcessor,
  ) {}

  /**
   * Initializes the consumer on module startup.
   * Registers the handler for the analytics queue.
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(`[AnalyticsConsumer] Initializing consumer for queue: ${this.QUEUE_NAME}`);
    await this.queueConsumer.consume(this.QUEUE_NAME, async (msg: ConsumeMessage) => {
      let job: any;
      try {
        job = JSON.parse(msg.content.toString());

        // 1. Validation
        const jobDto = plainToInstance(AnalyticsJobDto, job);
        const errors = await validate(jobDto);
        if (errors.length > 0) {
          const errorMsg = `Validation failed: ${JSON.stringify(errors)}`;
          this.logger.error(`[AnalyticsConsumer] ${errorMsg}`);
          await this.dlqService.sendToDlq(this.QUEUE_NAME, job, errorMsg);
          return; // Message is acknowledged by returning (QueueConsumer calls ack)
        }

        // 2. Idempotency Lock
        const lockKey = `lock:analytics:${jobDto.type}:${jobDto.period}`;
        const isLocked = await this.cache
          .getClient()
          .set(lockKey, 'true', 'EX', this.LOCK_TTL, 'NX');

        if (!isLocked) {
          this.logger.warn(`[AnalyticsConsumer] Job already in progress: ${lockKey}. Skipping.`);
          return;
        }

        try {
          await this.handleJob(jobDto);
        } finally {
          // Release lock after processing
          await this.cache.del(lockKey);
        }
      } catch (error: any) {
        this.logger.error(
          `[AnalyticsConsumer] Failed to process message: ${error.message}`,
          error.stack,
        );
        await this.dlqService.sendToDlq(
          this.QUEUE_NAME,
          job || msg.content.toString(),
          error.message,
        );
        // We catch here to avoid unhandled rejections that might cause basic nack
        // without DLQ routing logic in shared lib if not configured.
      }
    });
  }

  /**
   * Dispatches the analytics job to the appropriate domain processor.
   *
   * @param job - The validated analytics job payload
   * @returns A promise that resolves when processing is triggered/complete
   */
  async handleJob(job: AnalyticsJobDto): Promise<void> {
    this.logger.log(`[AnalyticsConsumer] Dispatching job: ${job.type} | Period: ${job.period}`);

    switch (job.type) {
      case AnalyticsJobType.USER_STATS:
        await this.userAnalytics.process(job.period);
        break;
      case AnalyticsJobType.PROJECT_STATS:
        await this.projectAnalytics.process(job.period);
        break;
      case AnalyticsJobType.REVENUE_REPORT:
        await this.revenueAnalytics.process(job.period);
        break;
      case AnalyticsJobType.PORTFOLIO_ANALYTICS:
        await this.portfolioAnalytics.process(job.period);
        break;
      case AnalyticsJobType.BLOG_ANALYTICS:
        await this.blogAnalytics.process(job.period);
        break;
      case AnalyticsJobType.ENGAGEMENT_METRICS:
        await this.engagementAnalytics.process(job.period);
        break;
      default:
        this.logger.warn(`[AnalyticsConsumer] Unsupported job type received: ${job.type}`);
    }
  }
}
