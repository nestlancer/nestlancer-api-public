import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketLibModule } from '../../src/websocket-lib.module';

describe('WebSocketLibModule', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [WebSocketLibModule],
    }).compile();

    expect(module).toBeDefined();
  });
});
