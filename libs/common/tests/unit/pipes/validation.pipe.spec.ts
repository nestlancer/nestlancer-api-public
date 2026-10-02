import { AppValidationPipe } from '../../../src/pipes/validation.pipe';
import { ValidationException } from '../../../src/exceptions/validation.exception';

describe('AppValidationPipe', () => {
  let pipe: AppValidationPipe;

  beforeEach(() => {
    pipe = new AppValidationPipe();
  });

  it('should throw ValidationException with formatted payload on failure', async () => {
    const value = { invalidField: 'test' };
    try {
      // Need a dummy class for validation
      class DummyDto {}
      await pipe.transform(value, { type: 'body', metatype: DummyDto });
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationException);
      const response = (e as ValidationException).getResponse() as any;
      expect(response.status).toBe('error');
      expect(response.error.code).toBeDefined();
      expect(response.error.message).toBe('Request validation failed');
      expect(response.error.details).toBeDefined();
    }
  });
});
