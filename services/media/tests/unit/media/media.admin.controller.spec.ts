import { Test, TestingModule } from '@nestjs/testing';
import { MediaAdminController } from '../../../src/media/media.admin.controller';
import { MediaAdminService } from '../../../src/media/media-admin.service';
import { MediaPortfolioPromoteService } from '../../../src/media/media-portfolio-promote.service';
import { QueryMediaDto } from '../../../src/dto/query-media.dto';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PrismaWriteService } from '@nestlancer/database';

describe('MediaAdminController', () => {
  let controller: MediaAdminController;
  let adminService: jest.Mocked<MediaAdminService>;

  const adminUser = { userId: 'admin-1', email: 'admin@test.com', roles: ['ADMIN'] };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaAdminController],
      providers: [
        {
          provide: MediaAdminService,
          useValue: {
            findAll: jest.fn(),
            findQuarantined: jest.fn(),
            getAnalytics: jest.fn(),
            findById: jest.fn(),
            getDownloadUrl: jest.fn(),
            getReferences: jest.fn(),
            getShares: jest.fn(),
            updateMetadata: jest.fn(),
            replaceFile: jest.fn(),
            bulkDelete: jest.fn(),
            cleanupOrphans: jest.fn(),
            reprocess: jest.fn(),
            deleteAny: jest.fn(),
            releaseQuarantined: jest.fn(),
          },
        },
        { provide: PrismaWriteService, useValue: { systemConfig: { upsert: jest.fn() } } },
        { provide: MediaPortfolioPromoteService, useValue: { promote: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MediaAdminController>(MediaAdminController);
    adminService = module.get(MediaAdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllMedia', () => {
    it('should call adminService.findAll', async () => {
      adminService.findAll.mockResolvedValue({ data: [], pagination: { total: 0 } } as any);
      const query = new QueryMediaDto();

      const result = await controller.getAllMedia(query);

      expect(adminService.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [], pagination: { total: 0 } });
    });
  });

  describe('getUserMedia', () => {
    it('should call adminService.findAll with uploaderId', async () => {
      adminService.findAll.mockResolvedValue({ data: [], pagination: { total: 0 } } as any);
      const query = new QueryMediaDto();

      await controller.getUserMedia('user-1', query);

      expect(adminService.findAll).toHaveBeenCalledWith({ ...query, uploaderId: 'user-1' });
    });
  });

  describe('getQuarantinedMedia', () => {
    it('should call adminService.findQuarantined', async () => {
      adminService.findQuarantined.mockResolvedValue({ data: [], pagination: { total: 0 } } as any);
      const query = new QueryMediaDto();

      const result = await controller.getQuarantinedMedia(query);

      expect(adminService.findQuarantined).toHaveBeenCalledWith(query);
      expect(result).toEqual({ data: [], pagination: { total: 0 } });
    });
  });

  describe('getStorageAnalytics', () => {
    it('should call adminService.getAnalytics', async () => {
      adminService.getAnalytics.mockResolvedValue({ totalBytes: 0 } as any);

      const result = await controller.getStorageAnalytics();

      expect(adminService.getAnalytics).toHaveBeenCalled();
      expect(result).toEqual({ totalBytes: 0 });
    });
  });

  describe('runCleanup', () => {
    it('should call adminService.cleanupOrphans', async () => {
      adminService.cleanupOrphans.mockResolvedValue({ dryRun: true, wouldDelete: 0 } as any);

      const result = await controller.runCleanup(adminUser as any, true);

      expect(adminService.cleanupOrphans).toHaveBeenCalledWith(true, 'admin-1');
      expect(result).toEqual({ dryRun: true, wouldDelete: 0 });
    });
  });

  describe('bulkDeleteMedia', () => {
    it('should call adminService.bulkDelete', async () => {
      adminService.bulkDelete.mockResolvedValue({ deleted: 1, failed: 0, results: [] } as any);

      const result = await controller.bulkDeleteMedia(adminUser as any, { ids: ['m-1'] } as any);

      expect(adminService.bulkDelete).toHaveBeenCalledWith({ ids: ['m-1'] }, 'admin-1');
      expect(result).toEqual({ deleted: 1, failed: 0, results: [] });
    });
  });

  describe('getMediaDetails', () => {
    it('should call adminService.findById', async () => {
      adminService.findById.mockResolvedValue({ id: '1' } as any);

      const result = await controller.getMediaDetails('1');

      expect(adminService.findById).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('getMediaReferences', () => {
    it('should call adminService.getReferences', async () => {
      adminService.getReferences.mockResolvedValue({ references: [], referenceCount: 0 } as any);

      const result = await controller.getMediaReferences('1');

      expect(adminService.getReferences).toHaveBeenCalledWith('1');
      expect(result).toEqual({ references: [], referenceCount: 0 });
    });
  });

  describe('deleteMedia', () => {
    it('should call adminService.deleteAny with force and adminId', async () => {
      adminService.deleteAny.mockResolvedValue({ deleted: true } as any);

      const result = await controller.deleteMedia(adminUser as any, '1', true);

      expect(adminService.deleteAny).toHaveBeenCalledWith('1', { force: true, adminId: 'admin-1' });
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('releaseQuarantinedMedia', () => {
    it('should call adminService.releaseQuarantined', async () => {
      adminService.releaseQuarantined.mockResolvedValue({ status: 'READY' } as any);

      const result = await controller.releaseQuarantinedMedia('1');

      expect(adminService.releaseQuarantined).toHaveBeenCalledWith('1');
      expect(result).toEqual({ status: 'READY' });
    });
  });
});
