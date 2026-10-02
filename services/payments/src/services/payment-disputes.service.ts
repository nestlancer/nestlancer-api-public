import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException, PaymentStatus } from '@nestlancer/common';
import { RazorpayService } from './razorpay.service';
import { RefundService } from './refund.service';

interface DisputeQueryParams {
  status?: string;
  page?: number;
  limit?: number;
}

interface DisputeResolution {
  action: 'accept' | 'contest';
  notes?: string;
  evidence?: string[];
  refundAmount?: number;
}

@Injectable()
export class PaymentDisputesService {
  private readonly logger = new Logger(PaymentDisputesService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly razorpayService: RazorpayService,
    private readonly refundService: RefundService,
  ) {}

  async getDisputes(query: DisputeQueryParams) {
    // Query params arrive as strings from HTTP; Prisma `take`/`skip` require Int.
    const page = Math.max(1, Number.parseInt(String(query.page ?? 1), 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(query.limit ?? 20), 10) || 20),
    );
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }

    const [disputes, total] = await Promise.all([
      this.prismaRead.dispute.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          payment: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              client: { select: { id: true, firstName: true, lastName: true, email: true } },
              project: { select: { id: true, title: true } },
            },
          },
        },
      }),
      this.prismaRead.dispute.count({ where }),
    ]);

    return {
      items: disputes.map((d) => ({
        id: d.id,
        paymentId: d.paymentId,
        amount: d.amount || (d as any).payment?.amount,
        currency: d.currency || (d as any).payment?.currency,
        status: d.status,
        reason: d.reason,
        client: (d as any).payment?.client,
        project: (d as any).payment?.project,
        payment: (d as any).payment,
        externalId: d.externalId,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async resolveDispute(
    disputeOrPaymentId: string,
    resolution: DisputeResolution & { resolutionType?: string },
  ) {
    const disputeById = await this.prismaRead.dispute.findUnique({
      where: { id: disputeOrPaymentId },
      select: { paymentId: true },
    });
    const paymentId = disputeById?.paymentId ?? disputeOrPaymentId;

    const payment = await this.prismaRead.payment.findUnique({
      where: { id: paymentId },
      include: { project: { select: { id: true, status: true } } },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const newStatus = resolution.action === 'accept' ? 'DISPUTE_LOST' : 'DISPUTE_CONTESTED';
    const resolutionType =
      resolution.resolutionType ?? (resolution.action === 'accept' ? 'FULL_REFUND' : 'NO_REFUND');

    const previousProjectStatus = (payment as any).project?.status ?? 'DISPUTED';
    const projectStatus = resolutionType === 'FULL_REFUND' ? 'CANCELLED' : 'IN_PROGRESS';

    let refundProcessed = false;
    if (
      (resolutionType === 'FULL_REFUND' || resolutionType === 'PARTIAL_REFUND') &&
      payment.status === PaymentStatus.COMPLETED
    ) {
      try {
        await this.refundService.processRefund(paymentId, 'dispute-resolve', {
          amount: resolution.refundAmount,
          reason: resolution.notes ?? 'Dispute resolution refund',
        } as any);
        refundProcessed = true;
      } catch (err) {
        const message = (err as Error).message;
        this.logger.error(`Dispute refund failed for payment ${paymentId}: ${message}`);
        throw new BusinessLogicException(
          `Refund could not be processed: ${message}`,
          'PAYMENT_DISPUTE_REFUND_FAILED',
        );
      }
    }

    await this.prismaWrite.$transaction(async (tx: any) => {
      const paymentUpdate: Record<string, unknown> = {
        refundStatus: newStatus,
        providerDetails: {
          ...((payment.providerDetails as object) || {}),
          disputeResolution: {
            action: resolution.action,
            resolutionType,
            notes: resolution.notes,
            evidence: resolution.evidence,
            resolvedAt: new Date().toISOString(),
          },
        },
      };

      if (!refundProcessed) {
        if (resolutionType === 'FULL_REFUND') {
          paymentUpdate.status = PaymentStatus.REFUNDED;
          paymentUpdate.amountRefunded = payment.amount;
        } else if (resolutionType === 'PARTIAL_REFUND') {
          paymentUpdate.status = PaymentStatus.COMPLETED;
          paymentUpdate.amountRefunded = { increment: resolution.refundAmount ?? 0 };
        } else {
          paymentUpdate.status = PaymentStatus.COMPLETED;
        }
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: paymentUpdate,
      });

      await tx.project.update({
        where: { id: payment.projectId },
        data: { status: projectStatus },
      });

      await tx.dispute.updateMany({
        where: { paymentId, status: 'OPEN' },
        data: {
          status: 'RESOLVED',
          resolutionType,
          resolutionNotes: resolution.notes,
        },
      });

      await tx.outbox.create({
        data: {
          type: 'PAYMENT_DISPUTE_RESOLVED',
          aggregateType: 'PAYMENT',
          aggregateId: paymentId,
          payload: {
            paymentId,
            clientId: payment.clientId,
            userId: payment.clientId,
            projectId: payment.projectId,
            action: resolution.action,
            resolutionType,
            notes: resolution.notes,
          },
        },
      });

      await tx.outbox.create({
        data: {
          type: 'PROJECT_STATUS_CHANGED',
          aggregateType: 'PROJECT',
          aggregateId: payment.projectId,
          payload: {
            projectId: payment.projectId,
            previousStatus: previousProjectStatus,
            status: projectStatus,
            reason: 'dispute_resolved',
            paymentId,
            resolutionType,
          },
        },
      });
    });

    return {
      success: true,
      paymentId,
      newStatus,
      resolutionType,
      projectStatus,
      refundProcessed,
    };
  }

  async updateDispute(disputeId: string, body: any): Promise<any> {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id: disputeId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const existingDetails = (payment.providerDetails as any) || {};

    const updated = await this.prismaWrite.payment.update({
      where: { id: disputeId },
      data: {
        refundStatus: body.status || payment.refundStatus,
        providerDetails: {
          ...existingDetails,
          disputeUpdate: {
            notes: body.notes,
            priority: body.priority,
            updatedAt: new Date().toISOString(),
          },
        },
      },
    });

    return {
      id: updated.id,
      status: updated.refundStatus,
      updatedAt: updated.updatedAt,
    };
  }

  async respondToDispute(
    disputeId: string,
    body: { notes?: string; evidence?: Record<string, unknown> },
  ): Promise<any> {
    const dispute = await this.prismaRead.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.status !== 'OPEN') {
      throw new BusinessLogicException(
        'Only OPEN disputes can receive an admin response',
        'PAYMENT_DISPUTE_INVALID_STATE',
      );
    }

    const existingEvidence = (dispute.evidence as Record<string, unknown>) || {};
    const updated = await this.prismaWrite.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'UNDER_REVIEW',
        resolutionNotes: body.notes ?? dispute.resolutionNotes,
        evidence: {
          ...existingEvidence,
          adminResponse: {
            notes: body.notes,
            evidence: body.evidence,
            respondedAt: new Date().toISOString(),
          },
        } as any,
      },
    });

    return {
      id: updated.id,
      paymentId: updated.paymentId,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }
}
