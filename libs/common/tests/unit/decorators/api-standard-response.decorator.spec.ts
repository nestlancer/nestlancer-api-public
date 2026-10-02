import { ApiStandardResponse } from '../../../src/decorators/api-standard-response.decorator';
import { DECORATORS } from '@nestjs/swagger/dist/constants';

class SampleUserDto {
  id!: string;
}

describe('ApiStandardResponse', () => {
  it('documents 200 envelope by default', () => {
    class TestController {
      @ApiStandardResponse()
      noop() {}
    }

    const response = Reflect.getMetadata(DECORATORS.API_RESPONSE, TestController.prototype.noop);
    expect(response['200']).toBeDefined();
    expect(response['200'].schema?.allOf).toBeDefined();
  });

  it('documents 201 when status option is set', () => {
    class TestController {
      @ApiStandardResponse({ message: 'Created', status: 201 })
      created() {}
    }

    const response = Reflect.getMetadata(DECORATORS.API_RESPONSE, TestController.prototype.created);
    expect(response['201']).toBeDefined();
    expect(response['201'].description).toBe('Created');
  });

  it('accepts { type: Dto } options object', () => {
    class TestController {
      @ApiStandardResponse({ type: SampleUserDto })
      withTypeOption() {}
    }

    const response = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      TestController.prototype.withTypeOption,
    );
    expect(response['200']).toBeDefined();
  });

  it('accepts a concrete DTO type without throwing', () => {
    class TestController {
      @ApiStandardResponse(SampleUserDto)
      withModel() {}
    }

    const response = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      TestController.prototype.withModel,
    );
    expect(response['200']).toBeDefined();
  });
});
