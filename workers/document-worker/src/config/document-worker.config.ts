import { registerAs } from '@nestjs/config';

export const documentWorkerConfig = registerAs('documentWorker', () => ({
  rabbitmq: {
    queue: process.env.DOCUMENT_QUEUE_NAME || 'document.queue',
  },
}));
