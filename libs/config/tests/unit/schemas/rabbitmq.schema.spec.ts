import { rabbitmqConfigSchema } from '../../../src/schemas/rabbitmq.schema';

describe('RabbitMQConfig Schema', () => {
  it('should validate valid input with defaults', () => {
    const data = { RABBITMQ_URL: 'amqp://localhost:5672' };
    const result = rabbitmqConfigSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.RABBITMQ_EXCHANGE_EVENTS).toBe('nestlancer.events');
      expect(result.data.RABBITMQ_PREFETCH).toBe(10);
    }
  });

  it('should explicitly fail if RABBITMQ_URL is missing', () => {
    const result = rabbitmqConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
