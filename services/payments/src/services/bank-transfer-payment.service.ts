import { Injectable } from '@nestjs/common';
import { PlatformPaymentAccountType } from '@prisma/client';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import {
  BusinessLogicException,
  PAYMENT_GATE_ERROR,
  PaymentCompletionService,
  PaymentStatus,
} from '@nestlancer/common';
import { PaymentGatingService } from './payment-gating.service';
import { PlatformPaymentAccountService } from './platform-payment-account.service';
import {
  ApproveTransferDto,
  RejectTransferDto,
  SubmitBankTransferDto,
} from '../dto/bank-transfer.dto';

const PROOF_MIME_ALLOW = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const MAX_PROOFS = 5;

@Injectable()
export class BankTransferPaymentService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly paymentGating: PaymentGatingService,
    private readonly platformAccounts: PlatformPaymentAccountService,
    private readonly paymentCompletion: PaymentCompletionService,
  ) {}

  /** Same UTR must not credit two payments. Lookup uses the write client so a just-written row is visible. */
  private async assertTransferReferenceAvailable(
    transferReference: string,
    exceptPaymentId?: string,
  ): Promise<void> {
    const reference = transferReference.trim();
    if (!reference) return;

    const duplicate = await this.prismaWrite.payment.findFirst({
      where: {
        ...(exceptPaymentId ? { id: { not: exceptPaymentId } } : {}),
        transferReference: reference,
        status: { in: [PaymentStatus.COMPLETED, PaymentStatus.PENDING_VERIFICATION] },
      },
      select: { id: true },
    });
    if (!duplicate) return;

    throw new BusinessLogicException(
      'This transfer reference is already used by another payment',
      PAYMENT_GATE_ERROR.DUPLICATE_TRANSFER_REFERENCE,
    );
  }

  private methodFromAccountType(type: PlatformPaymentAccountType): string {
    if (type === PlatformPaymentAccountType.UPI) return 'upi';
    return 'bank_transfer';
  }

  private async assertProofMedia(userId: string, mediaIds: string[]) {
    const uniqueIds = [...new Set(mediaIds)];
    if (uniqueIds.length > MAX_PROOFS) {
      throw new BusinessLogicException(
        `At most ${MAX_PROOFS} proof files are allowed`,
        PAYMENT_GATE_ERROR.OFFLINE_TRANSFER_BLOCKED,
      );
    }

    const media = await this.prismaRead.media.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
      select: { id: true, uploaderId: true, mimeType: true, status: true },
    });

    if (media.length !== uniqueIds.length) {
      throw new BusinessLogicException(
        'One or more proof media files were not found',
        PAYMENT_GATE_ERROR.OFFLINE_TRANSFER_BLOCKED,
      );
    }

    for (const m of media) {
      if (m.uploaderId !== userId) {
        throw new BusinessLogicException(
          'Proof media must be uploaded by the paying user',
          PAYMENT_GATE_ERROR.OFFLINE_TRANSFER_BLOCKED,
        );
      }
      if (!PROOF_MIME_ALLOW.has(m.mimeType)) {
        throw new BusinessLogicException(
          'Proof must be an image (JPEG/PNG/WebP/GIF) or PDF',
          PAYMENT_GATE_ERROR.OFFLINE_TRANSFER_BLOCKED,
        );
      }
      if (m.status === 'QUARANTINED' || m.status === 'FAILED') {
        throw new BusinessLogicException(
          'Proof media failed security checks',
          PAYMENT_GATE_ERROR.OFFLINE_TRANSFER_BLOCKED,
        );
      }
    }

    return uniqueIds;
  }

  async submit(userId: string, dto: SubmitBankTransferDto) {
    await this.paymentGating.assertCanCreateIntent(userId, dto.projectId, dto.milestoneId);

    const account = await this.platformAccounts.getActiveById(dto.platformAccountId);
    const mediaIds = await this.assertProofMedia(userId, dto.mediaIds);
    const transferReference = dto.transferReference.trim();

    const existing = await this.prismaWrite.payment.findFirst({
      where: {
        projectId: dto.projectId,
        clientId: userId,
        milestoneId: dto.milestoneId,
        status: {
          in: [
            PaymentStatus.CREATED,
            PaymentStatus.PENDING,
            PaymentStatus.PENDING_VERIFICATION,
            PaymentStatus.FAILED,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing?.status === PaymentStatus.PENDING && existing.intentId) {
      throw new BusinessLogicException(
        'Cancel the open Razorpay checkout before submitting a bank transfer',
        PAYMENT_GATE_ERROR.OFFLINE_TRANSFER_BLOCKED,
      );
    }

    if (existing?.status === PaymentStatus.COMPLETED) {
      throw new BusinessLogicException(
        'This milestone is already paid',
        PAYMENT_GATE_ERROR.PAYMENT_ALREADY_COMPLETED,
      );
    }

    // Amount must match expected payment / milestone amount (tolerance 0)
    const expectedAmount = existing?.amount ?? null;
    if (expectedAmount != null && expectedAmount !== dto.amount) {
      throw new BusinessLogicException(
        `Amount must match the scheduled payment (${expectedAmount} paise)`,
        PAYMENT_GATE_ERROR.INVALID_MILESTONE_AMOUNT,
      );
    }

    if (!existing) {
      const milestone = await this.prismaRead.milestone.findFirst({
        where: { id: dto.milestoneId, projectId: dto.projectId },
        select: { amount: true },
      });
      if (!milestone?.amount || milestone.amount !== dto.amount) {
        throw new BusinessLogicException(
          'Amount must match the milestone amount',
          PAYMENT_GATE_ERROR.INVALID_MILESTONE_AMOUNT,
        );
      }
    }

    const method = this.methodFromAccountType(account.type);
    const transferPaidAt = dto.transferPaidAt ? new Date(dto.transferPaidAt) : undefined;
    await this.assertTransferReferenceAvailable(transferReference, existing?.id);

    const payment = await this.prismaWrite.$transaction(async (tx) => {
      let row = existing;
      if (!row) {
        row = await tx.payment.create({
          data: {
            projectId: dto.projectId,
            milestoneId: dto.milestoneId,
            clientId: userId,
            amount: dto.amount,
            currency: 'INR',
            status: PaymentStatus.PENDING_VERIFICATION,
            method,
            transferReference,
            transferPaidAt,
            platformAccountId: account.id,
            customNotes: dto.notes || null,
            intentId: null,
          },
        });
      } else {
        row = await tx.payment.update({
          where: { id: row.id },
          data: {
            status: PaymentStatus.PENDING_VERIFICATION,
            method,
            amount: dto.amount,
            transferReference,
            transferPaidAt: transferPaidAt ?? null,
            platformAccountId: account.id,
            customNotes: dto.notes || row.customNotes,
            rejectedReason: null,
            failureReason: null,
            intentId: null,
            externalId: null,
            externalStatus: null,
          },
        });
        await tx.paymentProof.deleteMany({ where: { paymentId: row.id } });
      }

      await tx.paymentProof.createMany({
        data: mediaIds.map((mediaId) => ({
          paymentId: row!.id,
          mediaId,
          uploadedById: userId,
        })),
      });

      await tx.outbox.create({
        data: {
          type: 'PAYMENT_PENDING_VERIFICATION',
          aggregateType: 'PAYMENT',
          aggregateId: row.id,
          payload: {
            paymentId: row.id,
            projectId: dto.projectId,
            milestoneId: dto.milestoneId,
            clientId: userId,
            amount: dto.amount,
            currency: 'INR',
            transferReference,
            method,
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'BANK_TRANSFER_SUBMITTED',
          category: 'PAYMENT',
          resourceType: 'PAYMENT',
          resourceId: row.id,
          userId,
          description: `Offline transfer submitted with ref ${transferReference}`,
        },
      });

      return row;
    });

    const proofs = await this.prismaRead.paymentProof.findMany({
      where: { paymentId: payment.id },
      select: { id: true, mediaId: true, createdAt: true },
    });

    return {
      id: payment.id,
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      transferReference: payment.transferReference,
      platformAccountId: payment.platformAccountId,
      proofs,
    };
  }

  async approve(adminId: string, paymentId: string, dto: ApproveTransferDto) {
    const payment = await this.prismaRead.payment.findUnique({
      where: { id: paymentId },
      include: {
        client: { select: { email: true, firstName: true, lastName: true } },
        project: { select: { title: true } },
      },
    });

    if (!payment) {
      throw new BusinessLogicException(
        'Payment not found',
        PAYMENT_GATE_ERROR.TRANSFER_NOT_PENDING_VERIFICATION,
      );
    }

    if (payment.status !== PaymentStatus.PENDING_VERIFICATION) {
      throw new BusinessLogicException(
        'Payment is not awaiting transfer verification',
        PAYMENT_GATE_ERROR.TRANSFER_NOT_PENDING_VERIFICATION,
      );
    }

    if (payment.transferReference) {
      await this.assertTransferReferenceAvailable(payment.transferReference, paymentId);
    }

    await this.prismaWrite.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
        verifiedById: adminId,
        verifiedAt: new Date(),
        verificationNotes: dto.verificationNotes || null,
        rejectedReason: null,
        failureReason: null,
        providerDetails: {
          ...(typeof payment.providerDetails === 'object' && payment.providerDetails
            ? (payment.providerDetails as object)
            : {}),
          verifiedOffline: true,
        },
      },
    });

    await this.paymentCompletion.finalizeExistingPayment({
      paymentId: payment.id,
      projectId: payment.projectId,
      milestoneId: payment.milestoneId ?? undefined,
      clientId: payment.clientId,
      amount: payment.amount,
      currency: payment.currency,
      clientEmail: payment.client.email,
      clientName: `${payment.client.firstName} ${payment.client.lastName}`,
      projectTitle: payment.project.title,
      source: 'bank_transfer_verify',
      adminId,
    });

    await this.prismaWrite.outbox.create({
      data: {
        type: 'PAYMENT_TRANSFER_APPROVED',
        aggregateType: 'PAYMENT',
        aggregateId: payment.id,
        payload: {
          paymentId: payment.id,
          clientId: payment.clientId,
          amount: payment.amount,
          currency: payment.currency,
          transferReference: payment.transferReference,
          adminId,
        },
      },
    });

    return {
      paymentId: payment.id,
      status: PaymentStatus.COMPLETED,
    };
  }

  async reject(adminId: string, paymentId: string, dto: RejectTransferDto) {
    const payment = await this.prismaRead.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new BusinessLogicException(
        'Payment not found',
        PAYMENT_GATE_ERROR.TRANSFER_NOT_PENDING_VERIFICATION,
      );
    }
    if (payment.status !== PaymentStatus.PENDING_VERIFICATION) {
      throw new BusinessLogicException(
        'Payment is not awaiting transfer verification',
        PAYMENT_GATE_ERROR.TRANSFER_NOT_PENDING_VERIFICATION,
      );
    }

    const allowRetry = dto.allowRetry !== false;
    const nextStatus = allowRetry ? PaymentStatus.CREATED : PaymentStatus.FAILED;

    const updated = await this.prismaWrite.$transaction(async (tx) => {
      const row = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: nextStatus,
          rejectedReason: dto.reason,
          failureReason: dto.reason,
          verifiedById: adminId,
          verifiedAt: new Date(),
          verificationNotes: null,
        },
      });
      await tx.outbox.create({
        data: {
          type: 'PAYMENT_TRANSFER_REJECTED',
          aggregateType: 'PAYMENT',
          aggregateId: paymentId,
          payload: {
            paymentId,
            clientId: payment.clientId,
            projectId: payment.projectId,
            reason: dto.reason,
            allowRetry,
            adminId,
          },
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'BANK_TRANSFER_REJECTED',
          category: 'PAYMENT',
          resourceType: 'PAYMENT',
          resourceId: paymentId,
          userId: adminId,
          description: dto.reason,
        },
      });
      return row;
    });

    return {
      paymentId: updated.id,
      status: updated.status,
      rejectedReason: updated.rejectedReason,
    };
  }
}
