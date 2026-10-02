import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationQueryDto } from '../../../src/dto/pagination-query.dto';

describe('PaginationQueryDto', () => {
  it('should validate successfully with default transformations', async () => {
    const data = { page: '2', limit: '20' };
    const dto = plainToInstance(PaginationQueryDto, data);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(20);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with limit too high', async () => {
    const data = { limit: '999999' }; // over MAX_LIMIT
    const dto = plainToInstance(PaginationQueryDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should use default values if empty', async () => {
    const dto = plainToInstance(PaginationQueryDto, {});
    // Assuming DEFAULT_PAGE is 1 and DEFAULT_LIMIT is 10 based on common patterns
    expect(dto.page).toBeDefined();
    expect(dto.limit).toBeDefined();
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
