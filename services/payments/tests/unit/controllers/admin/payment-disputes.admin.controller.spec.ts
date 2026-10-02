import { Test, TestingModule } from '@nestjs/testing';
import { PaymentDisputesAdminController } from '../../../../src/controllers/admin/payment-disputes.admin.controller';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PaymentDisputesService } from '../../../../src/services/payment-disputes.service';
import { PaymentReconciliationService } from '../../../../src/services/payment-reconciliation.service';
import { PrismaReadService } from '@nestlancer/database';

describe('PaymentDisputesAdminController', () => {
  let controller: PaymentDisputesAdminController;
  let disputesService: jest.Mocked<PaymentDisputesService>;
  let reconciliationService: jest.Mocked<PaymentReconciliationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentDisputesAdminController],
      providers: [
        {
          provide: PaymentDisputesService,
          useValue: {
            getDisputes: jest.fn(),
            resolveDispute: jest.fn(),
          },
        },
        {
          provide: PaymentReconciliationService,
          useValue: {
            reconcilePayments: jest.fn(),
          },
        },
        { provide: PrismaReadService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentDisputesAdminController>(PaymentDisputesAdminController);
    disputesService = module.get(PaymentDisputesService);
    reconciliationService = module.get(PaymentReconciliationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDisputes', () => {
    it('should list disputes', async () => {
      disputesService.getDisputes.mockResolvedValue({ items: [] } as any);

      const result = await controller.getDisputes({ page: 1 });

      expect(disputesService.getDisputes).toHaveBeenCalledWith({ page: 1 });
      expect(result).toEqual({ items: [] });
    });
  });

  describe('resolveDispute', () => {
    it('should resolve a dispute', async () => {
      disputesService.resolveDispute.mockResolvedValue({ resolved: true } as any);

      const result = await controller.resolveDispute('1', { status: 'RESOLVED' });

      expect(disputesService.resolveDispute).toHaveBeenCalledWith('1', { status: 'RESOLVED' });
      expect(result).toEqual({ status: 'success', data: { resolved: true } });
    });
  });

  describe('reconcilePayments', () => {
    it('should reconcile payments', async () => {
      reconciliationService.reconcilePayments.mockResolvedValue({ reconciled: 5 } as any);

      const result = await controller.reconcilePayments({ date: '2023-01-01' });

      expect(reconciliationService.reconcilePayments).toHaveBeenCalledWith({ date: '2023-01-01' });
      expect(result).toEqual({ status: 'success', data: { reconciled: 5 } });
    });
  });
});
