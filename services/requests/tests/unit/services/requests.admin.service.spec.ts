import { RequestsAdminService } from '../../../src/services/requests.admin.service';

describe('RequestsAdminService', () => {
  let service: RequestsAdminService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;

  const mockRequest = {
    id: 'req-1',
    title: 'Build website',
    description: 'Full website',
    status: 'SUBMITTED',
    budgetMin: 1000,
    budgetMax: 5000,
    budgetCurrency: 'INR',
    user: { id: 'user-1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' },
    category: 'WEB_DEVELOPMENT',
    createdAt: new Date(),
    updatedAt: new Date(),
    submittedAt: new Date(),
    attachments: [],
    quotes: [],
    statusHistory: [],
    adminNotes: [],
    preferredStartDate: null,
    deadline: null,
    requirements: null,
    technicalRequirements: null,
  };

  beforeEach(() => {
    mockPrismaRead = {
      projectRequest: {
        findMany: jest.fn().mockResolvedValue([mockRequest]),
        count: jest.fn().mockResolvedValue(1),
        findFirst: jest.fn().mockResolvedValue(mockRequest),
      },
      adminNote: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    mockPrismaWrite = {
      projectRequest: {
        findFirst: jest.fn().mockResolvedValue(mockRequest),
      },
      $transaction: jest.fn().mockImplementation(async (fn) => {
        const tx = {
          projectRequest: {
            update: jest
              .fn()
              .mockResolvedValue({ ...mockRequest, status: 'UNDER_REVIEW', updatedAt: new Date() }),
          },
          requestStatusHistory: { create: jest.fn().mockResolvedValue({}) },
          outbox: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      }),
      adminNote: {
        create: jest.fn().mockResolvedValue({
          id: 'note-1',
          content: 'Test note',
          createdAt: new Date(),
          author: { id: 'admin-1', firstName: 'Admin', lastName: 'User' },
        }),
      },
    };

    service = new RequestsAdminService(mockPrismaWrite, mockPrismaRead);
  });

  describe('listRequests', () => {
    it('should return paginated requests', async () => {
      const result = await service.listRequests(1, 10);
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by status', async () => {
      await service.listRequests(1, 10, 'underReview');
      expect(mockPrismaRead.projectRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'UNDER_REVIEW' }) }),
      );
    });

    it('should exclude drafts by default', async () => {
      await service.listRequests(1, 10);
      expect(mockPrismaRead.projectRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { not: 'DRAFT' } }),
        }),
      );
    });

    it('should support inbox queue filter', async () => {
      await service.listRequests(1, 10, 'inbox');
      expect(mockPrismaRead.projectRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'] },
          }),
        }),
      );
    });

    it('should filter by userId', async () => {
      await service.listRequests(1, 10, undefined, 'user-1');
      expect(mockPrismaRead.projectRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) }),
      );
    });
  });

  describe('getRequestDetailsAdmin', () => {
    it('should return full request details', async () => {
      const result = await service.getRequestDetailsAdmin('req-1');
      expect(result.id).toBe('req-1');
    });

    it('should throw for non-existent request', async () => {
      mockPrismaWrite.projectRequest.findFirst.mockResolvedValue(null);
      await expect(service.getRequestDetailsAdmin('invalid')).rejects.toThrow();
    });
  });

  describe('updateRequestStatus', () => {
    it('should update status with transaction', async () => {
      const result = await service.updateRequestStatus(
        'req-1',
        'admin-1',
        'underReview',
        'Reviewing now',
      );
      expect(result.id).toBeDefined();
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });

    it('should throw for invalid status transition', async () => {
      mockPrismaWrite.projectRequest.findFirst.mockResolvedValueOnce({
        ...mockRequest,
        status: 'QUOTED',
      });
      await expect(service.updateRequestStatus('req-1', 'admin-1', 'submitted')).rejects.toThrow();
    });
  });

  describe('addNote', () => {
    it('should add admin note', async () => {
      const result = await service.addNote('req-1', 'admin-1', 'Test note');
      expect(result.id).toBe('note-1');
      expect(result.content).toBe('Test note');
    });

    it('should throw for non-existent request', async () => {
      mockPrismaWrite.projectRequest.findFirst.mockResolvedValue(null);
      await expect(service.addNote('invalid', 'admin-1', 'Note')).rejects.toThrow();
    });
  });

  describe('getNotes', () => {
    it('should return notes for a request', async () => {
      const result = await service.getNotes('req-1');
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
