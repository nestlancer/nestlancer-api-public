import { NOT_DELETED, SOFT_DELETE } from '../../../src/utils/soft-delete.util';

describe('SoftDeleteUtil', () => {
  it('NOT_DELETED should specify deletedAt is null', () => {
    expect(NOT_DELETED).toEqual({ deletedAt: null });
  });

  it('SOFT_DELETE should specify a recent deletedAt date', () => {
    expect(SOFT_DELETE).toHaveProperty('deletedAt');
    expect(SOFT_DELETE.deletedAt).toBeInstanceOf(Date);

    // Assert it was created just now
    const now = new Date().getTime();
    const deletedTime = SOFT_DELETE.deletedAt.getTime();
    expect(now - deletedTime).toBeLessThan(1000);
  });
});
