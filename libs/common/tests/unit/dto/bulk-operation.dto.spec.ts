import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BulkOperationDto } from '../../../src/dto/bulk-operation.dto';

describe('BulkOperationDto', () => {
  it('should validate successfully with an array of strings', async () => {
    const data = { ids: ['id1', 'id2'] };
    const dto = plainToInstance(BulkOperationDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with empty array', async () => {
    const data = { ids: [] };
    const dto = plainToInstance(BulkOperationDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail if more than 100 items', async () => {
    const data = { ids: Array(101).fill('id') };
    const dto = plainToInstance(BulkOperationDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
