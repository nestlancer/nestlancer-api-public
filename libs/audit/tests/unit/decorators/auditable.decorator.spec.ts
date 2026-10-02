import 'reflect-metadata';
import { Auditable, AUDITABLE_KEY } from '../../../src/decorators/auditable.decorator';

describe('Auditable Decorator', () => {
  it('should set metadata correctly', () => {
    class TestClass {
      @Auditable('CREATE', 'USER')
      testMethod() {}
    }

    const metadata = Reflect.getMetadata(AUDITABLE_KEY, TestClass.prototype.testMethod);
    expect(metadata).toEqual({ action: 'CREATE', resourceType: 'USER' });
  });
});
