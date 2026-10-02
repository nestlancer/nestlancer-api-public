import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DateRangeQueryDto } from '../../../src/dto/date-range-query.dto';

describe('DateRangeQueryDto', () => {
  it('should validate with valid ISO dates', async () => {
    const data = { startDate: '2025-01-01T00:00:00Z', endDate: '2025-12-31T23:59:59Z' };
    const dto = plainToInstance(DateRangeQueryDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid dates', async () => {
    const data = { startDate: 'not-a-date' };
    const dto = plainToInstance(DateRangeQueryDto, data);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass with empty object (optional params)', async () => {
    const dto = plainToInstance(DateRangeQueryDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
