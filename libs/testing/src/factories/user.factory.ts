export function createTestUser(
  overrides: Partial<{
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
  }> = {},
) {
  return {
    id: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
    status: 'ACTIVE',
    ...overrides,
  };
}
export function createTestAdmin(overrides: Record<string, unknown> = {}) {
  return createTestUser({
    id: 'test-admin',
    email: 'admin@example.com',
    name: 'Admin',
    role: 'ADMIN',
    ...overrides,
  });
}
