import 'reflect-metadata';
import { Consume, CONSUME_KEY } from '../../../src/decorators/consume.decorator';

describe('Consume Decorator', () => {
  it('should set consume metadata with the queue name', () => {
    class TestClass {
      @Consume('events.queue')
      handleEvent() {}
    }

    const metadata = Reflect.getMetadata(CONSUME_KEY, TestClass.prototype.handleEvent);
    expect(metadata).toEqual('events.queue');
  });
});
