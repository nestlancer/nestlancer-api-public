import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MilestoneApprovalService } from './milestone-approval.service';

/** Polls for milestones past review deadline and applies deemed acceptance. */
@Injectable()
export class MilestoneReviewSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MilestoneReviewSchedulerService.name);
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly milestoneApproval: MilestoneApprovalService) {}

  onModuleInit(): void {
    const ms = parseInt(process.env.MILESTONE_REVIEW_CRON_MS || '3600000', 10);
    this.intervalRef = setInterval(() => {
      void this.runDeemedAcceptance();
    }, ms);
    void this.runDeemedAcceptance();
  }

  onModuleDestroy(): void {
    if (this.intervalRef) clearInterval(this.intervalRef);
  }

  async runDeemedAcceptance(): Promise<void> {
    try {
      const count = await this.milestoneApproval.processDeemedAcceptance();
      if (count > 0) {
        this.logger.log(`Deemed acceptance applied to ${count} milestone(s)`);
      }
    } catch (e) {
      this.logger.warn(
        `Deemed acceptance run failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }
}
