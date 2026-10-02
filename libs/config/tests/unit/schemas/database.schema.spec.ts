import { databaseConfigSchema } from '../../../src/schemas/database.schema';

describe('DatabaseConfig Schema', () => {
  it('should validate valid DATABASE_URL', () => {
    const data = { DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/nestlancer' };
    const result = databaseConfigSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_POOL_MIN).toBe(2);
      expect(result.data.DATABASE_POOL_MAX).toBe(10);
    }
  });

  it('should fail if DATABASE_URL is invalid or missing', () => {
    const data = { DATABASE_URL: 'not-a-url' };
    const result = databaseConfigSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
