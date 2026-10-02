import { plainToInstance } from 'class-transformer';
import { Trim } from '../../../src/decorators/trim.decorator';

class TestClass {
  @Trim()
  name!: string;

  @Trim()
  value!: number | null;
}

describe('Trim Decorator', () => {
  it('should trim surrounding whitespace from string fields', () => {
    const data = { name: '  hello world  ' };
    const instance = plainToInstance(TestClass, data);
    expect(instance.name).toBe('hello world');
  });

  it('should ignore non-string values', () => {
    const data = { name: 'test', value: 123 };
    const instance = plainToInstance(TestClass, data);
    expect(instance.value).toBe(123);
  });
});
