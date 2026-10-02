import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMilestonesAdminController } from '../../../../src/controllers/admin/payment-milestones.admin.controller';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PaymentMilestonesService } from '../../../../src/services/payment-milestones.service';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { PaymentGatingService } from '../../../../src/services/payment-gating.service';
import { PaymentNotificationService } from '../../../../src/services/payment-notification.service';
import { ProgressProxyService } from '../../../../src/services/progress-proxy.service';

describe('PaymentMilestonesAdminController', () => {
  let controller: PaymentMilestonesAdminController;
  let milestonesService: jest.Mocked<PaymentMilestonesService>;
  let progressProxy: jest.Mocked<ProgressProxyService>;

  const milestoneId = 'milestone-1';
  const completedAt = new Date('2026-06-18T12:00:00.000Z');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentMilestonesAdminController],
      providers: [
        {
          provide: PaymentMilestonesService,
          useValue: {
            getPaymentsByMilestone: jest.fn(),
          },
        },
        { provide: PrismaReadService, useValue: {} },
        { provide: PrismaWriteService, useValue: {} },
        { provide: PaymentGatingService, useValue: { assertCanRequestPayment: jest.fn() } },
        { provide: PaymentNotificationService, useValue: { notifyPaymentRequested: jest.fn() } },
        {
          provide: ProgressProxyService,
          useValue: { completeMilestone: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentMilestonesAdminController>(PaymentMilestonesAdminController);
    milestonesService = module.get(PaymentMilestonesService);
    progressProxy = module.get(ProgressProxyService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPaymentsByMilestone', () => {
    it('should list payments for a milestone', async () => {
      milestonesService.getPaymentsByMilestone.mockResolvedValue([{ id: 'pay1' }] as any);

      const result = await controller.getPaymentsByMilestone('milestone1');

      expect(milestonesService.getPaymentsByMilestone).toHaveBeenCalledWith('milestone1');
      expect(result).toEqual({ status: 'success', data: [{ id: 'pay1' }] });
    });
  });

  describe('markComplete (deprecated)', () => {
    it('delegates to progress service with forwarded Authorization header', async () => {
      const progressResponse = {
        status: 'success',
        data: { id: milestoneId, status: 'COMPLETED', completedAt },
      };
      progressProxy.completeMilestone.mockResolvedValue(progressResponse);

      const req = { headers: { authorization: 'Bearer admin-token' } } as any;
      const result = await controller.markComplete(milestoneId, req);

      expect(progressProxy.completeMilestone).toHaveBeenCalledWith(
        'Bearer admin-token',
        milestoneId,
      );
      expect(result).toEqual(progressResponse);
    });
  });
});
