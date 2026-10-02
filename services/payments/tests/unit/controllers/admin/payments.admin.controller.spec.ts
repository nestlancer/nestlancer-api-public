import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsAdminController } from '../../../../src/controllers/admin/payments.admin.controller';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PaymentsService } from '../../../../src/services/payments.service';
import { RefundService } from '../../../../src/services/refund.service';
import { PaymentStatsService } from '../../../../src/services/payment-stats.service';
import { PaymentMilestonesService } from '../../../../src/services/payment-milestones.service';
import { PaymentReconciliationService } from '../../../../src/services/payment-reconciliation.service';
import { ProcessRefundDto } from '../../../../src/dto/process-refund.dto';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { ReceiptPdfService } from '../../../../src/services/receipt-pdf.service';
import { InvoicePdfService } from '../../../../src/services/invoice-pdf.service';
import { DocumentGenerationService } from '@nestlancer/documents';
import { PaymentCompletionService } from '@nestlancer/common';
import { RazorpayService } from '../../../../src/services/razorpay.service';

describe('PaymentsAdminController', () => {
  let controller: PaymentsAdminController;
  let paymentsService: jest.Mocked<PaymentsService>;
  let refundService: jest.Mocked<RefundService>;
  let statsService: jest.Mocked<PaymentStatsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsAdminController],
      providers: [
        {
          provide: PaymentsService,
          useValue: { getAdminPayments: jest.fn() },
        },
        {
          provide: RefundService,
          useValue: { processRefund: jest.fn() },
        },
        {
          provide: PaymentMilestonesService,
          useValue: { listMilestones: jest.fn() },
        },
        {
          provide: PaymentStatsService,
          useValue: { getStats: jest.fn() },
        },
        {
          provide: PaymentReconciliationService,
          useValue: { runReconciliation: jest.fn() },
        },
        { provide: ReceiptPdfService, useValue: {} },
        { provide: InvoicePdfService, useValue: {} },
        { provide: DocumentGenerationService, useValue: {} },
        { provide: PaymentCompletionService, useValue: { finalizeExistingPayment: jest.fn() } },
        { provide: RazorpayService, useValue: { fetchPayment: jest.fn() } },
        { provide: PrismaReadService, useValue: {} },
        { provide: PrismaWriteService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsAdminController>(PaymentsAdminController);
    paymentsService = module.get(PaymentsService);
    refundService = module.get(RefundService);
    statsService = module.get(PaymentStatsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPayments', () => {
    it('should call getAdminPayments', async () => {
      paymentsService.getAdminPayments.mockResolvedValue({ items: [], total: 0 } as any);

      const result = await controller.getPayments({ page: 1 });

      expect(paymentsService.getAdminPayments).toHaveBeenCalledWith({ page: 1 });
      expect(result).toEqual({ status: 'success', items: [], total: 0 });
    });
  });

  describe('getStats', () => {
    it('should return payment stats', async () => {
      statsService.getStats.mockResolvedValue({ totalRevenue: 100 } as any);

      const result = await controller.getStats();

      expect(statsService.getStats).toHaveBeenCalled();
      expect(result).toEqual({ status: 'success', data: { totalRevenue: 100 } });
    });
  });

  describe('processRefund', () => {
    it('should process a refund', async () => {
      refundService.processRefund.mockResolvedValue({ id: 'refund1' } as any);
      const dto = new ProcessRefundDto();

      const result = await controller.processRefund('pay1', 'admin1', dto);

      expect(refundService.processRefund).toHaveBeenCalledWith('pay1', 'admin1', dto);
      expect(result).toEqual({ status: 'success', data: { id: 'refund1' } });
    });
  });
});
