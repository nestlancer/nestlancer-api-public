import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PaymentReconciliationService } from './payment-reconciliation.service';

/** Daily auto-reconciliation with Razorpay (FEAT-006). */
@Injectable()
export class PaymentReconciliationSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentReconciliationSchedulerService.name);
  private intervalRef: ReturnType<typeof setInterval> | null = null;
  private healIntervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly reconciliation: PaymentReconciliationService) {}

  onModuleInit(): void {
    const ms = parseInt(process.env.PAYMENT_RECONCILIATION_CRON_MS || '86400000', 10);
    this.intervalRef = setInterval(() => {
      void this.run();
    }, ms);

    const healMs = parseInt(process.env.PAYMENT_PENDING_HEAL_CRON_MS || '120000', 10);
    this.healIntervalRef = setInterval(() => {
      void this.healPending();
    }, healMs);
  }

  onModuleDestroy(): void {
    if (this.intervalRef) clearInterval(this.intervalRef);
    if (this.healIntervalRef) clearInterval(this.healIntervalRef);
  }

  async healPending(): Promise<void> {
    try {
      const result = await this.reconciliation.healStalePendingPayments();
      if (result.healed > 0) {
        this.logger.log(`Healed ${result.healed} stale PENDING payment(s)`);
      }
    } catch (e) {
      this.logger.warn(`Pending heal cron failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async run(): Promise<void> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    try {
      const result = await this.reconciliation.reconcilePayments({ startDate, endDate });
      if (result.mismatches.length > 0) {
        this.logger.warn(
          `Reconciliation: ${result.mismatches.length} mismatch(es) of ${result.totalChecked} checked`,
        );
      }
    } catch (e) {
      this.logger.warn(`Reconciliation cron failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
