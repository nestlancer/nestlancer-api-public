import { ConflictException } from '@nestjs/common';
import { MediaAdminService } from '../../../src/media/media-admin.service';
import { MediaStatus } from '../../../src/interfaces/media.interface';

describe('MediaAdminService', () => {
  let service: MediaAdminService;
  let mockPrismaWrite: any;
  let mockPrismaRead: any;
  let mockStorageService: any;
  let mockMediaProcessing: any;
  let mockOutboxService: any;
  let mockReferencesService: any;
  let mockPublicScopeService: any;

  beforeEach(() => {
    mockPrismaRead = {
      media: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'm-1',
            status: 'READY',
            metadata: { storageKey: 'key' },
            uploader: {
              id: 'u-1',
              email: 'admin@test.com',
              firstName: 'Admin',
              lastName: 'User',
            },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue({
          id: 'm-1',
          status: 'READY',
          metadata: { storageKey: 'key' },
          uploaderId: 'u-1',
          uploader: {
            id: 'u-1',
            email: 'admin@test.com',
            firstName: 'Admin',
            lastName: 'User',
          },
        }),
        aggregate: jest.fn().mockResolvedValue({ _count: 3, _sum: { size: 5000 } }),
        groupBy: jest
          .fn()
          .mockResolvedValueOnce([
            { status: 'READY', _count: 2 },
            { status: 'PROCESSING', _count: 1 },
          ])
          .mockResolvedValueOnce([{ mimeType: 'image/png', _count: 3, _sum: { size: 5000 } }]),
      },
      mediaShareLink: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    mockPrismaWrite = {
      media: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'm-1',
          status: 'READY',
          metadata: { storageKey: 'key' },
          uploaderId: 'u-1',
        }),
        update: jest.fn().mockResolvedValue({ id: 'm-1', status: 'PROCESSING' }),
        delete: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (callback: (tx: any) => Promise<void>) => {
        await callback({
          media: {
            delete: jest.fn().mockResolvedValue({}),
          },
        });
      }),
    };
    mockStorageService = {
      deleteFile: jest.fn().mockResolvedValue(undefined),
      generatePresignedDownloadUrl: jest.fn().mockResolvedValue('https://download.example/key'),
      generateStorageKey: jest.fn().mockReturnValue('users/u-1/new-key.png'),
      upload: jest.fn().mockResolvedValue(undefined),
      getFileSize: jest.fn().mockResolvedValue(100),
      privateBucket: 'private-bucket',
    };
    mockMediaProcessing = {
      enqueue: jest.fn().mockResolvedValue(undefined),
    };
    mockOutboxService = {
      createEvent: jest.fn().mockResolvedValue('outbox-1'),
    };
    mockReferencesService = {
      findReferences: jest.fn().mockResolvedValue({ references: [], referenceCount: 0 }),
    };
    mockPublicScopeService = {
      resolvePublicScope: jest.fn().mockResolvedValue({
        ids: [],
        blogIds: [],
        portfolioIds: [],
        explicitIds: [],
      }),
      buildPublicWhere: jest.fn().mockResolvedValue({ id: '__no_public_media__' }),
      idsForPublicSource: jest.fn().mockResolvedValue([]),
      invalidateCache: jest.fn(),
    };
    const mockShareService = {
      buildShareUrl: jest.fn((token: string) => `https://example.com/share/${token}`),
      createShareLinkForMedia: jest.fn(),
      revokeShareLinksForMedia: jest.fn(),
      revokeShareLinkById: jest.fn(),
      listShareLinksForMedia: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };
    const mockLibraryScope = {
      buildRelatedToUserWhere: jest.fn().mockResolvedValue({ uploaderId: 'u-1' }),
      buildLibraryWhere: jest.fn().mockResolvedValue({ uploaderId: 'u-1' }),
    };

    service = new MediaAdminService(
      mockPrismaWrite,
      mockPrismaRead,
      mockStorageService,
      mockMediaProcessing,
      mockOutboxService,
      mockReferencesService,
      mockPublicScopeService,
      mockShareService as any,
      mockLibraryScope as any,
    );
  });

  describe('findAll', () => {
    it('should return paginated media with uploader summary', async () => {
      const result = await service.findAll({ page: 1, limit: 20 } as any);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].uploader).toEqual({
        id: 'u-1',
        email: 'admin@test.com',
        displayName: 'Admin User',
      });
      expect(result.pagination.totalItems).toBe(1);
    });
  });

  describe('getAnalytics', () => {
    it('should return storage analytics with uploadsByDay and counts', async () => {
      mockPrismaRead.media.findMany.mockResolvedValueOnce([
        { createdAt: new Date('2026-06-12T10:00:00.000Z') },
      ]);

      const result = await service.getAnalytics();
      expect(result.totalSize).toBe(5000);
      expect(result.byStatus).toHaveLength(2);
      expect(result.byMimeType).toEqual([{ mimeType: 'image/png', count: 3, size: 5000 }]);
      expect(result.processingCount).toBe(1);
      expect(result.uploadsByDay).toHaveLength(30);
    });
  });

  describe('reprocess', () => {
    it('should set status to PROCESSING', async () => {
      const result = await service.reprocess('m-1');
      expect(result.status).toBe('PROCESSING');
      expect(mockMediaProcessing.enqueue).toHaveBeenCalled();
    });
  });

  describe('deleteAny', () => {
    it('should delete media and emit outbox event when no references exist', async () => {
      const result = await service.deleteAny('m-1', { adminId: 'admin-1' });
      expect(result).toEqual({ deleted: true, id: 'm-1' });
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('key');
      expect(mockOutboxService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'MEDIA_ADMIN_DELETED' }),
        expect.anything(),
      );
    });

    it('should throw ConflictException when references exist and force is false', async () => {
      mockReferencesService.findReferences.mockResolvedValueOnce({
        references: [
          { type: 'project', resourceId: 'p-1', label: 'project: p-1', adminPath: '/projects/p-1' },
        ],
        referenceCount: 1,
      });

      await expect(service.deleteAny('m-1')).rejects.toThrow(ConflictException);
      expect(mockPrismaWrite.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('bulkDelete', () => {
    it('should return per-id results', async () => {
      const result = await service.bulkDelete({ ids: ['m-1', 'm-2'] } as any, 'admin-1');
      expect(result.deleted).toBe(2);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('replaceFile', () => {
    it('should block replace while processing without force', async () => {
      mockPrismaWrite.media.findUnique.mockResolvedValueOnce({
        id: 'm-1',
        status: MediaStatus.PROCESSING,
        uploaderId: 'u-1',
        metadata: { storageKey: 'old-key' },
      });

      await expect(
        service.replaceFile(
          'm-1',
          { originalname: 'new.png', mimetype: 'image/png', size: 100, buffer: Buffer.from('x') },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('cleanupOrphans', () => {
    it('should report dry-run counts without deleting', async () => {
      mockPublicScopeService.resolvePublicScope.mockResolvedValueOnce({
        ids: ['public-1'],
        blogIds: ['public-1'],
        portfolioIds: [],
        explicitIds: [],
      });
      mockPrismaRead.media.findMany.mockResolvedValueOnce([
        { id: 'orphan-1', filename: 'tmp.bin', originalFilename: 'tmp.bin', size: 100 },
      ]);

      const result = await service.cleanupOrphans(true);
      expect(result).toEqual({
        dryRun: true,
        wouldDelete: 1,
        cleaned: 1,
        bytesFreed: 100,
        ids: ['orphan-1'],
        orphans: [
          {
            id: 'orphan-1',
            filename: 'tmp.bin',
            size: 100,
            mimeType: undefined,
            status: undefined,
            uploaderId: undefined,
            createdAt: undefined,
          },
        ],
      });
      expect(mockPrismaRead.media.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contextId: null,
            id: { notIn: ['public-1'] },
          }),
        }),
      );
      expect(mockOutboxService.createEvent).not.toHaveBeenCalled();
    });
  });
});
