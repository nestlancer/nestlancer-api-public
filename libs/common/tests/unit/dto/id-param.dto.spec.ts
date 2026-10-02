import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IdParamDto } from '../../../src/dto/id-param.dto';

describe('IdParamDto', () => {
  it('should validate with a non-empty string', async () => {
    const data = { id: 'some-id' };
    const dto = plainToInstance(IdParamDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if empty', async () => {
    const data = { id: '' };
    const dto = plainToInstance(IdParamDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
