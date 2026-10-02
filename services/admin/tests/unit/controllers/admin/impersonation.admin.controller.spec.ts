import { Test, TestingModule } from '@nestjs/testing';
import { ImpersonationAdminController } from '../../../../src/controllers/admin/impersonation.admin.controller';
import { ImpersonationService } from '../../../../src/services/impersonation.service';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { AdminGuard } from '../../../../src/guards/admin.guard';

describe('ImpersonationAdminController', () => {
  let controller: ImpersonationAdminController;
  let service: jest.Mocked<ImpersonationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImpersonationAdminController],
      providers: [
        {
          provide: ImpersonationService,
          useValue: {
            startImpersonation: jest.fn(),
            endImpersonation: jest.fn(),
            getActiveSessions: jest.fn(),
          },
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

    controller = module.get<ImpersonationAdminController>(ImpersonationAdminController);
    service = module.get(ImpersonationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should start impersonation using x-user-id from gateway headers', async () => {
    service.startImpersonation.mockResolvedValue({ impersonationSessionId: 'sess-1' } as any);

    await controller.start('target-user-1', { reason: 'Support verification' }, {
      headers: { 'x-user-id': 'admin-1' },
    } as any);

    expect(service.startImpersonation).toHaveBeenCalledWith('admin-1', 'target-user-1', {
      reason: 'Support verification',
    });
  });
});
