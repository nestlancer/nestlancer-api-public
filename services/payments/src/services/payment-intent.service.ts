import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';
import { RazorpayService } from './razorpay.service';
import { PaymentGatingService } from './payment-gating.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { BusinessLogicException, PAYMENT_GATE_ERROR, PaymentStatus } from '@nestlancer/common';

/** Razorpay's minimum order is ₹1 (100 paise). Above this, the PSP rejects with a 500-shaped error. */
const RAZORPAY_MIN_PAISE = 100;
/** Matches the manual-payment hard cap (₹10,00,000). */
const RAZORPAY_MAX_PAISE = 100_000_000;

function resolveRazorpayOrderId(order: unknown): string | null {
  if (!order || typeof order !== 'object') return null;
  const o = order as Record<string, unknown>;
  const id = o.id ?? o.order_id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/** Razorpay `receipt` must be ≤ 40 chars; `rcpt_` + UUID (41) is rejected. */
function buildRazorpayReceipt(paymentId: string): string {
  if (paymentId.length <= 40) return paymentId;
  return paymentId.replace(/-/g, '').slice(0, 40);
}

@Injectable()
export class PaymentIntentService {
  private readonly logger = new Logger(PaymentIntentService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly razorpayService: RazorpayService,
    private readonly paymentGating: PaymentGatingService,
  ) {}

  private buildIntentResponse(payment: {
    id: string;
    projectId: string;
    amount: number;
    currency: string;
    status: string;
    intentId?: string | null;
  }) {
    const orderId = payment.intentId ?? '';
    return {
      id: payment.id,
      projectId: payment.projectId,
      amount: payment.amount,
      currency: payment.currency,
      clientSecret: orderId,
      intentId: orderId,
      status: payment.status,
    };
  }

  async createIntent(
    userId: string,
    dto: CreatePaymentIntentDto,
    idempotencyKey?: string,
  ): Promise<any> {
    const currency = dto.currency || 'INR';
    const amount = dto.amount;

    this.assertChargeAmount(amount);

    await this.paymentGating.assertCanCreateIntent(userId, dto.projectId, dto.milestoneId);
    await this.assertAmountMatchesObligation(dto.projectId, dto.milestoneId, amount);

    const scope = {
      projectId: dto.projectId,
      clientId: userId,
      ...(dto.milestoneId ? { milestoneId: dto.milestoneId } : { milestoneId: null }),
    };

    const replay = await this.findIdempotentReplay(userId, idempotencyKey, dto);
    if (replay) return this.buildIntentResponse(replay);

    const awaitingVerification = await this.prismaWrite.payment.findFirst({
      where: { ...scope, status: PaymentStatus.PENDING_VERIFICATION },
      select: { id: true },
    });
    if (awaitingVerification) {
      throw new BusinessLogicException(
        'This milestone has a bank transfer awaiting verification. Cancel is not available — wait for admin review or contact support.',
        PAYMENT_GATE_ERROR.OFFLINE_TRANSFER_BLOCKED,
      );
    }

    const existing = await this.prismaWrite.payment.findFirst({
      where: {
        ...scope,
        status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Reuse only when the live order is still `created` AND the amount matches this request.
    // A second Pay click for a different invoice/amount must not reopen the previous order.
    if (
      existing?.status === PaymentStatus.PENDING &&
      existing.intentId &&
      existing.amount === amount
    ) {
      try {
        const razorpayOrder = await this.razorpayService.fetchOrder(existing.intentId);
        const orderAmount = typeof razorpayOrder?.amount === 'number' ? razorpayOrder.amount : 0;
        if (razorpayOrder?.status === 'created' && orderAmount === amount) {
          return this.buildIntentResponse(existing);
        }
      } catch {
        // Unknown or expired order — mint a replacement below.
      }
    }

    if (existing && existing.amount !== amount) {
      await this.prismaWrite.payment.updateMany({
        where: {
          id: existing.id,
          status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING] },
        },
        data: { status: PaymentStatus.CANCELLED },
      });
    }

    const reusable =
      existing && existing.amount === amount && existing.status !== PaymentStatus.CANCELLED
        ? existing
        : null;

    let payment = reusable
      ? reusable
      : await this.prismaWrite.payment.create({
          data: {
            projectId: dto.projectId,
            milestoneId: dto.milestoneId,
            clientId: userId,
            amount,
            currency,
            status: PaymentStatus.CREATED,
            providerDetails: idempotencyKey ? { idempotencyKey } : undefined,
          },
        });

    if (idempotencyKey && reusable && !this.readIdempotencyKey(reusable.providerDetails)) {
      payment = await this.prismaWrite.payment.update({
        where: { id: payment.id },
        data: {
          providerDetails: {
            ...(this.asRecord(payment.providerDetails) ?? {}),
            idempotencyKey,
          },
        },
      });
    }

    let order: unknown;
    try {
      order = await this.razorpayService.createOrder(
        amount,
        currency,
        buildRazorpayReceipt(payment.id),
      );
    } catch (error: unknown) {
      await this.prismaWrite.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw this.mapProviderError(error);
    }

    const orderId = resolveRazorpayOrderId(order);
    if (!orderId) {
      await this.prismaWrite.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new InternalServerErrorException(
        'Failed to create payment intent with Razorpay. Check payment provider configuration.',
      );
    }

    const updatedPayment = await this.prismaWrite.payment.update({
      where: { id: payment.id },
      data: {
        intentId: orderId,
        status: PaymentStatus.PENDING,
        amount,
      },
    });

    return this.buildIntentResponse(updatedPayment);
  }

  private assertChargeAmount(amount: number): void {
    if (!Number.isInteger(amount) || amount < RAZORPAY_MIN_PAISE || amount > RAZORPAY_MAX_PAISE) {
      throw new BusinessLogicException(
        `Amount must be an integer between ${RAZORPAY_MIN_PAISE} and ${RAZORPAY_MAX_PAISE} paise`,
        PAYMENT_GATE_ERROR.INVALID_MILESTONE_AMOUNT,
      );
    }
  }

  /** Milestone checkout must charge the installment, never a leftover order's amount. */
  private async assertAmountMatchesObligation(
    projectId: string,
    milestoneId: string | undefined,
    amount: number,
  ): Promise<void> {
    if (!milestoneId) return;
    const milestone = await this.prismaWrite.milestone.findFirst({
      where: { id: milestoneId, projectId },
      select: { amount: true },
    });
    if (!milestone || !milestone.amount || milestone.amount <= 0) {
      throw new BusinessLogicException(
        'This milestone does not have a payable amount',
        PAYMENT_GATE_ERROR.INVALID_MILESTONE_AMOUNT,
      );
    }
    if (amount !== milestone.amount) {
      throw new BusinessLogicException(
        'Amount must match the milestone balance',
        PAYMENT_GATE_ERROR.INVALID_MILESTONE_AMOUNT,
      );
    }
  }

  private async findIdempotentReplay(
    userId: string,
    idempotencyKey: string | undefined,
    dto: CreatePaymentIntentDto,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) return null;
    const rows = await this.prismaWrite.payment.findMany({
      where: {
        clientId: userId,
        projectId: dto.projectId,
        status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING] },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    return (
      rows.find(
        (row) =>
          this.readIdempotencyKey(row.providerDetails) === key &&
          row.amount === dto.amount &&
          (row.milestoneId ?? null) === (dto.milestoneId ?? null) &&
          Boolean(row.intentId),
      ) ?? null
    );
  }

  private readIdempotencyKey(details: unknown): string | null {
    const record = this.asRecord(details);
    const key = record?.idempotencyKey;
    return typeof key === 'string' && key.trim() ? key.trim() : null;
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  }

  private mapProviderError(error: unknown): BusinessLogicException {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.warn(`Razorpay order create failed: ${message}`);
    const lower = message.toLowerCase();
    if (lower.includes('minimum') || lower.includes('maximum') || lower.includes('amount')) {
      return new BusinessLogicException(
        'Payment amount was rejected by the payment provider',
        PAYMENT_GATE_ERROR.INVALID_MILESTONE_AMOUNT,
      );
    }
    return new BusinessLogicException(
      'Payment provider could not create an order. Try again or contact support.',
      PAYMENT_GATE_ERROR.PROVIDER_REJECTED,
    );
  }
}
