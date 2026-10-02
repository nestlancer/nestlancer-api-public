import { ProjectsAdminService } from '../../../src/services/projects.admin.service';

describe('ProjectsAdminService', () => {
  let service: ProjectsAdminService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  beforeEach(() => {
    mockPrismaRead = {
      project: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'p1',
            title: 'Website',
            status: 'IN_PROGRESS',
            createdAt: new Date(),
            user: { firstName: 'John', email: 'test@example.com' },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue({
          id: 'p1',
          status: 'IN_PROGRESS',
          clientId: 'client-1',
        }),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    mockPrismaWrite = {
      project: {
        update: jest.fn().mockResolvedValue({ id: 'p1', status: 'REVIEW', updatedAt: new Date() }),
      },
      $transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {
          project: {
            update: jest.fn().mockResolvedValue({
              id: 'p1',
              status: 'REVIEW',
              projectId: 'p1',
              updatedAt: new Date(),
            }),
          },
          outbox: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      }),
    };
    service = new ProjectsAdminService(mockPrismaWrite, mockPrismaRead);
  });

  describe('listProjects', () => {
    it('should return paginated projects', async () => {
      const result = await service.listProjects(1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should map COMPLETED status filter without mangling enum', async () => {
      await service.listProjects(1, 10, undefined, 'COMPLETED');
      expect(mockPrismaRead.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('should map completed camelCase status filter', async () => {
      await service.listProjects(1, 10, undefined, 'completed');
      expect(mockPrismaRead.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });
  });

  describe('updateProjectStatus', () => {
    it('should update status with outbox event', async () => {
      const result = await service.updateProjectStatus('p1', 'admin-1', {
        status: 'review',
        reason: 'Ready for sign-off',
      } as any);
      expect(result.projectId).toBe('p1');
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });

    it('should block REVIEW when milestone payments are unpaid', async () => {
      mockPrismaRead.payment.findMany.mockResolvedValue([{ customNotes: null }]);
      await expect(
        service.updateProjectStatus('p1', 'admin-1', { status: 'review' } as any),
      ).rejects.toThrow('All milestone payments must be completed');
    });

    it('should throw for non-existent project', async () => {
      mockPrismaRead.project.findUnique.mockResolvedValue(null);
      await expect(
        service.updateProjectStatus('invalid', 'admin-1', { status: 'review' } as any),
      ).rejects.toThrow();
    });

    it('should reject a no-op status change instead of emitting another event', async () => {
      mockPrismaRead.project.findUnique.mockResolvedValue({
        id: 'p1',
        status: 'COMPLETED',
        clientId: 'client-1',
      });
      await expect(
        service.updateProjectStatus('p1', 'admin-1', { status: 'COMPLETED', reason: 'again' } as any),
      ).rejects.toThrow(/already COMPLETED/i);
      expect(mockPrismaWrite.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('should update project data', async () => {
      await service.updateProject('p1', { title: 'New Title' } as any);
      expect(mockPrismaWrite.project.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { title: 'New Title' },
      });
    });

    it('should throw for non-existent project', async () => {
      mockPrismaRead.project.findUnique.mockResolvedValue(null);
      await expect(service.updateProject('invalid', {} as any)).rejects.toThrow();
    });
  });
});
