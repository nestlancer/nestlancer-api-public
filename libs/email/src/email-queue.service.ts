import { QUEUE_EMAIL } from '@nestlancer/common';
import { QueuePublisherService } from '@nestlancer/queue';

import type { EmailJob } from './email-job.interface';

/**
 * Publishes normalized email jobs directly to email.queue.
 */
export async function publishEmailJob(
  publisher: QueuePublisherService,
  job: EmailJob,
  queueName = process.env.EMAIL_QUEUE_NAME || QUEUE_EMAIL,
): Promise<void> {
  await publisher.sendToQueue(queueName, job);
}

export async function publishEmailJobs(
  publisher: QueuePublisherService,
  jobs: EmailJob[],
  queueName = process.env.EMAIL_QUEUE_NAME || QUEUE_EMAIL,
): Promise<void> {
  for (const job of jobs) {
    await publisher.sendToQueue(queueName, job);
  }
}
