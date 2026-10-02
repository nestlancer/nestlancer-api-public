import 'reflect-metadata';
import { ApiPaginated } from '../../../src/decorators/api-paginated.decorator';

describe('ApiPaginated Decorator', () => {
  it('should be defined and applicable to a method', () => {
    class TestClass {
      @ApiPaginated()
      testMethod() {}
    }

    const instance = new TestClass();
    expect(instance.testMethod).toBeDefined();
    // As it applies Swagger metadata (ApiQuery), we just ensure no runtime error occurs during definition
  });
});
