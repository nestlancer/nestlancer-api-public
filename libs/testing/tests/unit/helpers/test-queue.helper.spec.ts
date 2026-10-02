import {
  setupTestQueue,
  teardownTestQueue,
  resetTestQueue,
  getTestQueueConnection,
  getTestQueueChannel,
} from '../../../src/helpers/test-queue.helper';

import * as amqp from 'amqplib';

// Mock amqplib
jest.mock('amqplib', () => {
  return {
    connect: jest.fn().mockImplementation(() => {
      return {
        createChannel: jest.fn().mockImplementation(() => {
          return {
            close: jest.fn().mockResolvedValue(undefined),
            deleteQueue: jest.fn().mockResolvedValue(undefined),
            deleteExchange: jest.fn().mockResolvedValue(undefined),
          };
        }),
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe('Test Queue Helper', () => {
  afterEach(async () => {
    await teardownTestQueue();
  });

  it('should setup the queue connection and channel', async () => {
    const { connection, channel } = await setupTestQueue();
    expect(connection).toBeDefined();
    expect(channel).toBeDefined();
    expect(getTestQueueConnection()).toBe(connection);
    expect(getTestQueueChannel()).toBe(channel);
  });

  it('should teardown the queue connection and channel', async () => {
    const { connection, channel } = await setupTestQueue();
    await teardownTestQueue();

    expect(channel.close).toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalled();
    expect(getTestQueueConnection()).toBeNull();
    expect(getTestQueueChannel()).toBeNull();
  });

  it('should reset the queue by deleting specified queues and exchanges', async () => {
    const { channel } = await setupTestQueue();

    await resetTestQueue(['test-exchange'], ['test-queue']);

    expect(channel.deleteQueue).toHaveBeenCalledWith('test-queue');
    expect(channel.deleteExchange).toHaveBeenCalledWith('test-exchange');
  });

  it('should ignore reset if channel is not set up', async () => {
    await expect(resetTestQueue(['test'], ['test'])).resolves.toBeUndefined();
  });

  it('should gracefully handle errors when deleting non-existent queues/exchanges', async () => {
    const { channel } = await setupTestQueue();

    (channel.deleteQueue as jest.Mock).mockRejectedValueOnce(new Error('Queue not found'));
    (channel.deleteExchange as jest.Mock).mockRejectedValueOnce(new Error('Exchange not found'));

    await expect(resetTestQueue(['test-exchange'], ['test-queue'])).resolves.toBeUndefined();
  });

  it('should ignore teardown if connection is not set up', async () => {
    await expect(teardownTestQueue()).resolves.toBeUndefined();
  });
});
