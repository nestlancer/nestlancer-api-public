import { Test, TestingModule } from '@nestjs/testing';
import { SystemAdminController } from '../../../../src/controllers/admin/system.admin.controller';
import { SystemConfigService } from '../../../../src/services/system-config.service';
import { FeatureFlagsService } from '../../../../src/services/feature-flags.service';
import { MaintenanceModeService } from '../../../../src/services/maintenance-mode.service';
import { CacheManagementService } from '../../../../src/services/cache-management.service';
import { BackgroundJobsService } from '../../../../src/services/background-jobs.service';
import { SystemLogsService } from '../../../../src/services/system-logs.service';
import { AnnouncementsService } from '../../../../src/services/announcements.service';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { AdminGuard } from '../../../../src/guards/admin.guard';

describe('SystemAdminController', () => {
  let controller: SystemAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemAdminController],
      providers: [
        { provide: SystemConfigService, useValue: { getAll: jest.fn(), set: jest.fn() } },
        {
          provide: FeatureFlagsService,
          useValue: { findAll: jest.fn(), toggleFeature: jest.fn() },
        },
        { provide: MaintenanceModeService, useValue: { toggle: jest.fn() } },
        { provide: CacheManagementService, useValue: { clearCache: jest.fn() } },
        {
          provide: BackgroundJobsService,
          useValue: { findAll: jest.fn(), retryJob: jest.fn(), cancelJob: jest.fn() },
        },
        {
          provide: SystemLogsService,
          useValue: { queryLogs: jest.fn(), generateDownloadLink: jest.fn() },
        },
        { provide: AnnouncementsService, useValue: { send: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SystemAdminController>(SystemAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
