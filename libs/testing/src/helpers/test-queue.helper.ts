import * as amqp from 'amqplib';

let amqpConnection: any = null;
let amqpChannel: any = null;

/**
 * Set up the test RabbitMQ connection and channel.
 */
export async function setupTestQueue(): Promise<{
  connection: amqp.Connection;
  channel: amqp.Channel;
}> {
  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

  const connection = await amqp.connect(rabbitmqUrl);
  const channel = await connection.createChannel();

  amqpConnection = connection;
  amqpChannel = channel;

  return { connection: connection as any, channel: channel as any };
}

/**
 * Tear down the test RabbitMQ connection and channel.
 */
export async function teardownTestQueue(): Promise<void> {
  if (amqpChannel) {
    await amqpChannel.close();
    amqpChannel = null;
  }
  if (amqpConnection) {
    await amqpConnection.close();
    amqpConnection = null;
  }
}

/**
 * Cleanup the test RabbitMQ by deleting exchanges and queues used during tests.
 * This is a broad cleanup; specific tests should ideally clean up their own resources.
 */
export async function resetTestQueue(
  exchanges: string[] = [],
  queues: string[] = [],
): Promise<void> {
  if (!amqpChannel) return;

  for (const queue of queues) {
    await amqpChannel.deleteQueue(queue).catch(() => {});
  }
  for (const exchange of exchanges) {
    await amqpChannel.deleteExchange(exchange).catch(() => {});
  }
}

/**
 * Get the current test RabbitMQ connection.
 */
export function getTestQueueConnection(): amqp.Connection | null {
  return amqpConnection;
}

/**
 * Get the current test RabbitMQ channel.
 */
export function getTestQueueChannel(): amqp.Channel | null {
  return amqpChannel;
}
