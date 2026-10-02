import { isPaymentScheduleMilestone } from '@nestlancer/common';
import { PrismaReadService } from '@nestlancer/database';
import type {
  PaymentDocumentContext,
  PaymentScheduleRow,
  PaymentTransactionRow,
} from '@nestlancer/pdf';

type PaymentRefSource = {
  id: string;
  status?: string;
  externalId?: string | null;
  intentId?: string | null;
  invoiceNumber?: string | null;
  receiptNumber?: string | null;
  method?: string | null;
  providerDetails?: unknown;
  customNotes?: string | null;
  transferReference?: string | null;
};

function extractCustomNotesReference(customNotes?: string | null): string | null {
  if (!customNotes?.trim()) return null;
  const utrMatch = customNotes.match(/\bUTR[:\s]+([A-Za-z0-9-]+)/i);
  if (utrMatch?.[1]) return utrMatch[1].trim();
  const refMatch = customNotes.match(/\b(?:ref(?:erence)?|txn|transaction)[:\s]+([A-Za-z0-9-]+)/i);
  if (refMatch?.[1]) return refMatch[1].trim();
  return null;
}

function extractProviderReference(providerDetails: unknown): string | null {
  if (!providerDetails || typeof providerDetails !== 'object') return null;
  const details = providerDetails as Record<string, unknown>;
  const keys = [
    'utr',
    'UTR',
    'bankReference',
    'reference',
    'transactionId',
    'razorpay_payment_id',
    'razorpayPaymentId',
  ];
  for (const key of keys) {
    const value = details[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

/** Resolve the most appropriate official reference for tax / audit documents. */
export function resolvePaymentReference(payment: PaymentRefSource): string {
  if (payment.transferReference?.trim()) return payment.transferReference.trim();
  const providerRef = extractProviderReference(payment.providerDetails);
  const notesRef = extractCustomNotesReference(payment.customNotes);
  if (payment.externalId?.trim()) return payment.externalId.trim();
  if (providerRef) return providerRef;
  if (notesRef) return notesRef;
  if (payment.intentId?.trim()) return payment.intentId.trim();
  if (payment.status === 'COMPLETED' && payment.receiptNumber?.trim()) {
    return payment.receiptNumber.trim();
  }
  if (payment.receiptNumber?.trim()) return payment.receiptNumber.trim();
  if (payment.invoiceNumber?.trim()) return payment.invoiceNumber.trim();
  return '';
}

function resolveContractReference(
  quote?: {
    quoteNumber?: string | null;
    contractNumber?: string | null;
  } | null,
): { contractReference?: string; quoteNumber?: string } {
  const contractNumber = quote?.contractNumber?.trim();
  const quoteNumber = quote?.quoteNumber?.trim();
  return {
    contractReference: contractNumber || quoteNumber || undefined,
    quoteNumber: quoteNumber || undefined,
  };
}

export async function buildPaymentDocumentContext(
  prisma: PrismaReadService,
  paymentId: string,
): Promise<PaymentDocumentContext | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, email: true } },
      project: {
        select: {
          id: true,
          title: true,
          quoteId: true,
          quote: { select: { id: true, quoteNumber: true, contractNumber: true } },
        },
      },
      milestone: { select: { id: true, name: true, amount: true, order: true } },
    },
  });

  if (!payment) return null;

  const [milestones, projectPayments] = await Promise.all([
    prisma.milestone.findMany({
      where: { projectId: payment.projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        amount: true,
        percentage: true,
        order: true,
        status: true,
      },
    }),
    prisma.payment.findMany({
      where: { projectId: payment.projectId },
      orderBy: [{ paidAt: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        milestoneId: true,
        amount: true,
        status: true,
        method: true,
        externalId: true,
        intentId: true,
        invoiceNumber: true,
        receiptNumber: true,
        providerDetails: true,
        customNotes: true,
        transferReference: true,
        paidAt: true,
        createdAt: true,
        milestone: { select: { name: true } },
      },
    }),
  ]);

  const scheduleMilestones = milestones.filter((m) => isPaymentScheduleMilestone(m));
  const scheduleRows =
    scheduleMilestones.length > 0
      ? scheduleMilestones
      : milestones.filter((m) => m.amount != null && m.amount > 0);

  const paymentsByMilestone = new Map<string, (typeof projectPayments)[number]>();
  for (const row of projectPayments) {
    if (!row.milestoneId) continue;
    const existing = paymentsByMilestone.get(row.milestoneId);
    if (!existing || row.status === 'COMPLETED') {
      paymentsByMilestone.set(row.milestoneId, row);
    }
  }

  const completedPayments = projectPayments.filter((p) => p.status === 'COMPLETED');
  const contractRefs = resolveContractReference(payment.project.quote);

  const paymentSchedule: PaymentScheduleRow[] = scheduleRows.map((milestone, index) => {
    const linked = paymentsByMilestone.get(milestone.id);
    const isCurrent = payment.milestoneId === milestone.id;
    const isPaid = linked?.status === 'COMPLETED';
    const isDue =
      !isPaid &&
      (linked?.status === 'PENDING' ||
        linked?.status === 'PROCESSING' ||
        linked?.status === 'CREATED' ||
        linked?.status === 'PENDING_VERIFICATION' ||
        isCurrent);

    let status: PaymentScheduleRow['status'] = 'pending';
    let statusLabel = 'Pending';
    if (isPaid) {
      status = 'paid';
      statusLabel = 'Paid';
    } else if (isCurrent) {
      status = 'current';
      statusLabel = 'This payment';
    } else if (isDue) {
      status = 'due';
      statusLabel = 'Due';
    }

    return {
      sequence: index + 1,
      name: milestone.name,
      amountPaise: milestone.amount ?? linked?.amount ?? 0,
      status,
      statusLabel,
      transactionRef: linked ? resolvePaymentReference(linked) || undefined : undefined,
      invoiceNumber: linked?.invoiceNumber?.trim() || undefined,
      receiptNumber: linked?.receiptNumber?.trim() || undefined,
      paidAt: linked?.paidAt?.toISOString(),
      paymentId: linked?.id,
      isCurrent,
    };
  });

  const currentScheduleIndex = paymentSchedule.findIndex((row) => row.isCurrent);
  const paymentSequenceLabel =
    paymentSchedule.length > 0
      ? `Payment ${currentScheduleIndex >= 0 ? currentScheduleIndex + 1 : '?'} of ${paymentSchedule.length}`
      : undefined;

  const currentPhaseLabel = payment.milestone
    ? paymentSchedule.length > 0 && currentScheduleIndex >= 0
      ? `Phase ${currentScheduleIndex + 1} of ${paymentSchedule.length} · ${payment.milestone.name}`
      : payment.milestone.name
    : undefined;

  const contractValuePaise = scheduleRows.reduce((sum, m) => sum + (m.amount ?? 0), 0);
  const totalPaidPaise = completedPayments.reduce((sum, p) => sum + p.amount, 0);

  const transactionHistory: PaymentTransactionRow[] = completedPayments.map((row, index) => ({
    sequence: index + 1,
    date: (row.paidAt ?? row.createdAt).toISOString(),
    amountPaise: row.amount,
    milestoneName: row.milestone?.name ?? 'Project payment',
    transactionRef:
      resolvePaymentReference(row) || row.receiptNumber?.trim() || row.invoiceNumber?.trim() || '—',
    invoiceNumber: row.invoiceNumber?.trim() || undefined,
    receiptNumber: row.receiptNumber?.trim() || undefined,
    paymentId: row.id,
    isCurrent: row.id === payment.id,
  }));

  return {
    paymentId: payment.id,
    paymentStatus: payment.status,
    paymentMethod: payment.method ?? undefined,
    invoiceNumber: payment.invoiceNumber?.trim() || undefined,
    receiptNumber: payment.receiptNumber?.trim() || undefined,
    transactionId:
      payment.transferReference?.trim() ||
      payment.externalId?.trim() ||
      extractProviderReference(payment.providerDetails) ||
      extractCustomNotesReference(payment.customNotes) ||
      undefined,
    transactionRef:
      resolvePaymentReference(payment) ||
      payment.receiptNumber?.trim() ||
      payment.invoiceNumber?.trim() ||
      payment.id,
    paidAt: payment.paidAt?.toISOString(),
    paidAtDisplay: payment.paidAt?.toISOString(),
    paymentRequestedAt: payment.paymentRequestedAt?.toISOString(),
    engagement: {
      projectId: payment.project.id,
      projectTitle: payment.project.title,
      contractReference: contractRefs.contractReference,
      quoteNumber: contractRefs.quoteNumber,
      currentMilestoneName: payment.milestone?.name,
      currentPhaseLabel,
      paymentSequenceLabel,
      contractValuePaise,
      totalPaidPaise,
      totalPendingPaise: Math.max(0, contractValuePaise - totalPaidPaise),
      completedPaymentsCount: completedPayments.length,
      schedulePaymentsCount: paymentSchedule.length,
    },
    paymentSchedule,
    transactionHistory,
  };
}

export function paymentStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
