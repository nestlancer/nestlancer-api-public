import { MockQueueService } from '../../../src/mocks/queue.mock';

describe('MockQueueService', () => {
  let mockService: MockQueueService;

  beforeEach(() => {
    mockService = new MockQueueService();
  });

  it('should have a working publish method returning a Promise', async () => {
    await expect(mockService.publish('exchange', 'key', {})).resolves.toBeUndefined();
  });

  it('should have a working sendToQueue method returning a Promise', async () => {
    await expect(mockService.sendToQueue('queue', {})).resolves.toBeUndefined();
  });

  it('should provide a mocked channel', () => {
    const channel = mockService.getChannel();
    expect(channel.assertQueue).toBeDefined();
    expect(channel.assertExchange).toBeDefined();
    expect(channel.bindQueue).toBeDefined();
    expect(channel.consume).toBeDefined();
  });
});
