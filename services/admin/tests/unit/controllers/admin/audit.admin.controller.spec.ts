import { Test, TestingModule } from '@nestjs/testing';
import { AuditAdminController } from '../../../../src/controllers/admin/audit.admin.controller';
import { AuditService } from '../../../../src/services/audit.service';
import { AuditExportService } from '../../../../src/services/audit-export.service';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { AdminGuard } from '../../../../src/guards/admin.guard';

describe('AuditAdminController', () => {
  let controller: AuditAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditAdminController],
      providers: [
        {
          provide: AuditService,
          useValue: {
            findAll: jest.fn(),
            getStats: jest.fn(),
            getUserTrail: jest.fn(),
            getResourceTrail: jest.fn(),
            findOne: jest.fn(),
          },
        },
        { provide: AuditExportService, useValue: { triggerExport: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditAdminController>(AuditAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
