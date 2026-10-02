import { createTestUser, createTestAdmin } from '../../../src/factories/user.factory';

describe('UserFactory', () => {
  it('should create a user with default values', () => {
    const user = createTestUser();
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.role).toBe('USER');
  });

  it('should override user values', () => {
    const user = createTestUser({ role: 'ADMIN', email: 'admin@test.com' });
    expect(user.role).toBe('ADMIN');
    expect(user.email).toBe('admin@test.com');
  });

  it('should create an admin user', () => {
    const admin = createTestAdmin();
    expect(admin.role).toBe('ADMIN');
  });
});
