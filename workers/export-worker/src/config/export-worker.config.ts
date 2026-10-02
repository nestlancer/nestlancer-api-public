import { registerAs } from '@nestjs/config';

export const exportWorkerConfig = registerAs('exportWorker', () => ({
  rabbitmq: {
    queue: process.env.EXPORT_QUEUE_NAME || 'export.queue',
  },
}));
