import { Injectable, Logger } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';

import { PaymentCompletedEventDto } from '../dto/payment-completed-event.dto';

const PROJECT_STATUS_PENDING_PAYMENT = 'PENDING_PAYMENT';
const PROJECT_STATUS_IN_PROGRESS = 'IN_PROGRESS';

/**
 * Idempotent project lifecycle transitions driven by domain events (outbox / RabbitMQ).
 */
@Injectable()
export class ProjectLifecycleService {
  private readonly logger = new Logger(ProjectLifecycleService.name);

  constructor(private readonly prismaWrite: PrismaWriteService) {}

  /**
   * After payment completes, move project from PENDING_PAYMENT → IN_PROGRESS if still waiting.
   */
  async handlePaymentCompleted(dto: PaymentCompletedEventDto): Promise<void> {
    const project = await this.prismaWrite.project.findUnique({
      where: { id: dto.projectId },
      select: { id: true, status: true },
    });

    if (!project) {
      this.logger.warn(`PaymentCompleted: project ${dto.projectId} not found`);
      return;
    }

    if (project.status !== PROJECT_STATUS_PENDING_PAYMENT) {
      return;
    }

    await this.prismaWrite.project.update({
      where: { id: dto.projectId },
      data: { status: PROJECT_STATUS_IN_PROGRESS },
    });

    this.logger.log(
      `PaymentCompleted: project ${dto.projectId} started (PENDING_PAYMENT → IN_PROGRESS)`,
    );
  }
}
