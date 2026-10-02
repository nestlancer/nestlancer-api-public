import { Test, TestingModule } from '@nestjs/testing';
import { DashboardAdminController } from '../../../../src/controllers/admin/dashboard.admin.controller';
import { DashboardService } from '../../../../src/services/dashboard.service';
import { DashboardRevenueService } from '../../../../src/services/dashboard-revenue.service';
import { DashboardUsersService } from '../../../../src/services/dashboard-users.service';
import { DashboardProjectsService } from '../../../../src/services/dashboard-projects.service';
import { DashboardPerformanceService } from '../../../../src/services/dashboard-performance.service';
import { AuditService } from '../../../../src/services/audit.service';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { AdminGuard } from '../../../../src/guards/admin.guard';

describe('DashboardAdminController', () => {
  let controller: DashboardAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardAdminController],
      providers: [
        {
          provide: DashboardService,
          useValue: { getOverview: jest.fn() },
        },
        {
          provide: DashboardRevenueService,
          useValue: { getRevenue: jest.fn() },
        },
        {
          provide: DashboardUsersService,
          useValue: { getUserMetrics: jest.fn() },
        },
        {
          provide: DashboardProjectsService,
          useValue: { getProjectMetrics: jest.fn() },
        },
        {
          provide: DashboardPerformanceService,
          useValue: { getPerformance: jest.fn() },
        },
        {
          provide: AuditService,
          useValue: { getRecentActivity: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DashboardAdminController>(DashboardAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
