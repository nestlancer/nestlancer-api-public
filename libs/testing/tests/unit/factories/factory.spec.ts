import { createTestUser, createTestAdmin } from '../../../src/factories/user.factory';
import { createTestProject } from '../../../src/factories/project.factory';

describe('Testing Factories', () => {
  describe('UserFactory', () => {
    it('should create a test user', () => {
      const user = createTestUser();
      expect(user.role).toBe('USER');
      expect(user.status).toBe('ACTIVE');
    });

    it('should create a test admin', () => {
      const admin = createTestAdmin({ name: 'Super Admin' });
      expect(admin.role).toBe('ADMIN');
      expect(admin.name).toBe('Super Admin');
    });
  });

  describe('ProjectFactory', () => {
    it('should create a test project', () => {
      const project = createTestProject();
      expect(project.status).toBe('CREATED');
      expect(project.clientId).toBeDefined();
    });

    it('should override project properties', () => {
      const project = createTestProject({ status: 'IN_PROGRESS' });
      expect(project.status).toBe('IN_PROGRESS');
    });
  });
});
