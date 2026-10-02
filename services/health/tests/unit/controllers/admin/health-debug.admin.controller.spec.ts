import { Test, TestingModule } from '@nestjs/testing';
import { HealthDebugAdminController } from '../../../../src/controllers/admin/health-debug.admin.controller';
import { HealthService } from '../../../../src/services/health.service';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';

jest.mock('@nestlancer/auth-lib', () => ({
  JwtAuthGuard: jest.fn().mockImplementation(() => ({ canActivate: () => true })),
  RolesGuard: jest.fn().mockImplementation(() => ({ canActivate: () => true })),
}));

describe('HealthDebugAdminController', () => {
  let controller: HealthDebugAdminController;
  let healthService: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthDebugAdminController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            getDebugHealth: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<HealthDebugAdminController>(HealthDebugAdminController);
    healthService = module.get(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDebugInfo', () => {
    it('should call healthService.getDebugHealth', async () => {
      healthService.getDebugHealth.mockResolvedValue({ mock: 'data' } as any);

      const result = await controller.getDebugInfo();

      expect(healthService.getDebugHealth).toHaveBeenCalled();
      expect(result).toEqual({ mock: 'data' });
    });
  });
});
