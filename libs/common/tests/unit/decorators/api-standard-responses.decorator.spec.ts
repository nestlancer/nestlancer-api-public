import { Controller, Get } from '@nestjs/common';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { ApiStandardResponses } from '../../../src/decorators/api-standard-responses.decorator';
import { ApiResponse } from '@nestjs/swagger';

describe('ApiStandardResponses', () => {
  it('documents handlers that lack a JSON response schema', () => {
    @ApiStandardResponses()
    @Controller('items')
    class ItemsController {
      @Get()
      list() {
        return [];
      }
    }

    const response = Reflect.getMetadata(DECORATORS.API_RESPONSE, ItemsController.prototype.list);
    expect(response['200']).toBeDefined();
    expect(response['200'].schema?.allOf).toBeDefined();
  });

  it('skips handlers that already declare a JSON response schema', () => {
    @ApiStandardResponses()
    @Controller('items')
    class ItemsController {
      @Get('typed')
      @ApiResponse({
        status: 200,
        content: { 'application/json': { schema: { type: 'string' } } },
      })
      typed() {
        return 'ok';
      }
    }

    const response = Reflect.getMetadata(DECORATORS.API_RESPONSE, ItemsController.prototype.typed);
    expect(response['200'].content['application/json'].schema).toEqual({ type: 'string' });
    expect(response['200'].schema?.allOf).toBeUndefined();
  });

  it('skips handlers that use ApiOkResponse with top-level schema', () => {
    @ApiStandardResponses()
    @Controller('items')
    class ItemsController {
      @Get('envelope')
      @ApiResponse({
        status: 200,
        schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Item' } } },
      })
      envelope() {
        return {};
      }
    }

    const response = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      ItemsController.prototype.envelope,
    );
    expect(response['200'].schema).toBeDefined();
    expect(response['200'].schema?.allOf).toBeUndefined();
  });
});
