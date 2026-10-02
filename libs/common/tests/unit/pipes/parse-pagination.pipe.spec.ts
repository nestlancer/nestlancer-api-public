import { ParsePaginationPipe } from '../../../src/pipes/parse-pagination.pipe';
import { PaginationQueryDto } from '../../../src/dto/pagination-query.dto';

describe('ParsePaginationPipe', () => {
  let pipe: ParsePaginationPipe;

  beforeEach(() => {
    pipe = new ParsePaginationPipe();
  });

  it('should set default values if none provided', () => {
    const result = pipe.transform({} as PaginationQueryDto);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20); // Assume DEFAULT_LIMIT is 20
  });

  it('should bound negative page to 1', () => {
    const result = pipe.transform({ page: -5 } as PaginationQueryDto);
    expect(result.page).toBe(1);
  });

  it('should bound limit between MIN and MAX', () => {
    // Assuming MIN_LIMIT=1, MAX_LIMIT=100
    const resultTooHigh = pipe.transform({ limit: 500 } as PaginationQueryDto);
    expect(resultTooHigh.limit).toBe(100);

    const resultTooLow = pipe.transform({ limit: -10 } as PaginationQueryDto);
    expect(resultTooLow.limit).toBe(1);
  });

  it('should keep valid inputs', () => {
    const result = pipe.transform({ page: 5, limit: 50 } as PaginationQueryDto);
    expect(result.page).toBe(5);
    expect(result.limit).toBe(50);
  });
});
