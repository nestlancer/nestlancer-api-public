import { createTestProject } from '../../../src/factories/project.factory';

describe('Project Factory', () => {
  it('should create a project with default values', () => {
    const project = createTestProject();
    expect(project).toEqual({
      id: 'test-project',
      title: 'Test Project',
      description: 'Description',
      status: 'CREATED',
      clientId: 'test-user',
    });
  });

  it('should override default values when provided', () => {
    const project = createTestProject({ title: 'New Title', status: 'IN_PROGRESS' });
    expect(project.title).toBe('New Title');
    expect(project.status).toBe('IN_PROGRESS');
  });
});
