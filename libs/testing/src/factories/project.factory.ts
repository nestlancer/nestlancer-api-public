export function createTestProject(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-project',
    title: 'Test Project',
    description: 'Description',
    status: 'CREATED',
    clientId: 'test-user',
    ...overrides,
  };
}
