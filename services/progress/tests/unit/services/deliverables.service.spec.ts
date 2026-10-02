import { DeliverablesService } from '../../../src/services/deliverables.service';

describe('DeliverablesService', () => {
  let service: DeliverablesService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockStorage: any;
  let mockConfig: any;

  beforeEach(() => {
    mockPrismaRead = {
      milestone: {
        findMany: jest.fn().mockResolvedValue([{ id: 'ms-1', status: 'IN_PROGRESS' }]),
        findFirst: jest.fn().mockResolvedValue({
          id: 'ms-1',
          project: { id: 'proj-1', clientId: 'user-1', title: 'Test Project', status: 'IN_PROGRESS' },
        }),
      },
      deliverable: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'd1',
          name: 'Deliverable',
          status: 'READY_FOR_REVIEW',
          milestone: {
            project: { id: 'proj-1', clientId: 'user-1', title: 'Test Project' },
          },
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'd1',
            status: 'PENDING',
            attachments: ['media-1'],
            milestoneId: 'ms-1',
            createdAt: new Date(),
          },
        ]),
      },
      media: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'media-1',
            filename: 'file.pdf',
            originalFilename: 'file.pdf',
            metadata: { storageKey: 'users/admin/file.pdf' },
          },
        ]),
      },
    };
    mockPrismaWrite = {
      $transaction: jest.fn(async (fn: (tx: any) => Promise<unknown>) =>
        fn({
          deliverable: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'd-new',
              milestoneId: 'ms-1',
              name: 'Deliverable Upload',
              status: 'READY_FOR_REVIEW',
            }),
            update: jest.fn().mockResolvedValue({ id: 'd1', description: 'Updated' }),
          },
          outbox: { create: jest.fn().mockResolvedValue({}) },
          media: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findFirst: jest.fn().mockResolvedValue({ filename: 'file.pdf' }) },
        }),
      ),
      deliverable: {
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    mockStorage = {
      getSignedUrl: jest.fn().mockResolvedValue('https://cdn.example.com/signed-url'),
    };
    mockConfig = {
      storageBucketPrivate: 'nestlancer-private',
    };
    const mockMilestoneApproval = {
      healOpenDeliverablesForApprovedMilestones: jest.fn().mockResolvedValue(0),
      advanceIfDeliverablesClosed: jest.fn().mockResolvedValue(false),
    };
    service = new DeliverablesService(
      mockPrismaWrite,
      mockPrismaRead,
      mockStorage,
      mockConfig,
      mockMilestoneApproval as any,
    );
  });

  describe('create', () => {
    it('should create a deliverable', async () => {
      const result = await service.create('proj-1', {
        milestoneId: 'ms-1',
        description: 'Test',
        mediaIds: ['media-1'],
      } as any);
      expect(result.id).toBe('d-new');
      expect(mockPrismaWrite.$transaction).toHaveBeenCalled();
    });
  });

  describe('getProjectDeliverables', () => {
    it('should return deliverables with signed URLs', async () => {
      const result = await service.getProjectDeliverables('proj-1');
      expect(result).toHaveLength(1);
      expect(mockStorage.getSignedUrl).toHaveBeenCalledWith({
        bucket: 'nestlancer-private',
        key: 'users/admin/file.pdf',
        expiresIn: 3600,
      });
      expect((result[0] as any).mediaUrls[0]).toEqual({
        url: 'https://cdn.example.com/signed-url',
        label: 'file.pdf',
        mediaId: 'media-1',
        size: undefined,
      });
    });
  });

  describe('update', () => {
    it('should update deliverable description', async () => {
      const result = await service.update('d1', { description: 'Updated' } as any);
      expect(result.description).toBe('Updated');
    });
  });

  describe('delete', () => {
    it('should delete deliverable', async () => {
      const result = await service.delete('d1');
      expect(result.success).toBe(true);
    });
  });
});
