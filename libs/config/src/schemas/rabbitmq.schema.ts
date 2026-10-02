import { z } from 'zod';

export const rabbitmqConfigSchema = z.object({
  RABBITMQ_URL: z.string(),
  RABBITMQ_EXCHANGE_EVENTS: z.string().default('nestlancer.events'),
  RABBITMQ_EXCHANGE_WEBHOOKS: z.string().default('webhooks'),
  RABBITMQ_PREFETCH: z.coerce.number().default(10),
  RABBITMQ_RETRY_DELAY: z.coerce.number().default(5000),
  RABBITMQ_MAX_RETRIES: z.coerce.number().default(3),
});

export type RabbitMQConfig = z.infer<typeof rabbitmqConfigSchema>;
