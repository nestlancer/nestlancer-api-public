import { Test, TestingModule } from '@nestjs/testing';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { RedisIoAdapter } from '../../../src/adapters/redis.adapter';

describe('RedisIoAdapter', () => {
  let adapter: RedisIoAdapter;
  let app: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({}).compile();
    app = module.createNestApplication();
    adapter = new RedisIoAdapter(app);
  });

  it('should create an IO server with options', () => {
    const mockServer = { close: jest.fn() };
    const parentSpy = jest
      .spyOn(IoAdapter.prototype, 'createIOServer')
      .mockReturnValue(mockServer as any);
    const server = adapter.createIOServer(3000, { path: '/ws' } as any);

    const callArgs = parentSpy.mock.calls[0];
    expect(callArgs[0]).toBe(3000);
    expect(callArgs[1]).toEqual(
      expect.objectContaining({
        path: '/ws',
        cors: expect.objectContaining({
          credentials: true,
        }),
      }),
    );
    const origin = callArgs[1].cors.origin;
    expect(origin).not.toBe('*');
    expect(typeof origin === 'function' || Array.isArray(origin)).toBe(true);
    expect(server).toBe(mockServer);
    server.close();
    parentSpy.mockRestore();
  });
});
