export class MockQueueService {
  async publish(_exchange: string, _routingKey: string, _payload: unknown) {
    return Promise.resolve();
  }
  async sendToQueue(_queue: string, _payload: unknown) {
    return Promise.resolve();
  }
  async consume(_queue: string, _handler: Function) {
    return Promise.resolve();
  }
  getChannel() {
    return {
      assertQueue: jest.fn(),
      assertExchange: jest.fn(),
      bindQueue: jest.fn(),
      consume: jest.fn(),
    };
  }
}
