import { Test, TestingModule } from '@nestjs/testing';
import { SystemAdminController } from '../../src/controllers/admin/system.admin.controller';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { AdminGuard } from '../../src/guards/admin.guard';
import { SystemConfigService } from '../../src/services/system-config.service';
import { FeatureFlagsService } from '../../src/services/feature-flags.service';
import { MaintenanceModeService } from '../../src/services/maintenance-mode.service';
import { CacheManagementService } from '../../src/services/cache-management.service';
import { BackgroundJobsService } from '../../src/services/background-jobs.service';
import { SystemLogsService } from '../../src/services/system-logs.service';
import { AnnouncementsService } from '../../src/services/announcements.service';

describe('SystemAdminController', () => {
  let controller: SystemAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemAdminController],
      providers: [
        { provide: SystemConfigService, useValue: { getAll: jest.fn().mockResolvedValue({}) } },
        { provide: FeatureFlagsService, useValue: { findAll: jest.fn().mockResolvedValue([]) } },
        {
          provide: MaintenanceModeService,
          useValue: { getStatus: jest.fn().mockResolvedValue({ enabled: false }) },
        },
        { provide: CacheManagementService, useValue: {} },
        { provide: BackgroundJobsService, useValue: {} },
        { provide: SystemLogsService, useValue: {} },
        { provide: AnnouncementsService, useValue: {} },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
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

  it('should return system config', async () => {
    const config = await controller.getConfig();
    expect(config).toBeDefined();
  });
});
