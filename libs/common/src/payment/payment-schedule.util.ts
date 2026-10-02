import { BusinessLogicException } from '../exceptions/business-logic.exception';
import { isQuoteLineItemBreakdown, resolveBreakdownAmountPaise } from './quote-line-items.util';
import {
  PaymentScheduleDueTrigger,
  PaymentScheduleInstallment,
  PaymentSchedulePresetDefinition,
  PaymentSchedulePresetId,
} from './payment-schedule.types';

const ROUNDING_TOLERANCE_PAISE = 1;

export const PAYMENT_SCHEDULE_PRESETS: PaymentSchedulePresetDefinition[] = [
  {
    id: '50-50',
    label: '50% deposit / 50% on completion',
    description: 'Half upfront to start, half after final delivery approval.',
    installments: [
      { label: 'Deposit', percentage: 50, dueTrigger: 'on_accept', type: 'advance' },
      {
        label: 'Final payment',
        percentage: 50,
        dueTrigger: 'on_prior_approved',
        type: 'final',
      },
    ],
  },
  {
    id: '30-70',
    label: '30% deposit / 70% on completion',
    description: 'Lower upfront commitment; majority due after delivery approval.',
    installments: [
      { label: 'Deposit', percentage: 30, dueTrigger: 'on_accept', type: 'advance' },
      {
        label: 'Final payment',
        percentage: 70,
        dueTrigger: 'on_prior_approved',
        type: 'final',
      },
    ],
  },
  {
    id: '30-40-30',
    label: '30% / 40% / 30% phased',
    description: 'Deposit, mid-project payment, and final payment.',
    installments: [
      { label: 'Deposit', percentage: 30, dueTrigger: 'on_accept', type: 'advance' },
      {
        label: 'Mid-project payment',
        percentage: 40,
        dueTrigger: 'on_prior_approved',
        type: 'milestone',
      },
      {
        label: 'Final payment',
        percentage: 30,
        dueTrigger: 'on_prior_approved',
        type: 'final',
      },
    ],
  },
  {
    id: '25-25-25-25',
    label: '25% × 4 milestones',
    description: 'Four equal installments across the project.',
    installments: [
      { label: 'Deposit', percentage: 25, dueTrigger: 'on_accept', type: 'advance' },
      {
        label: 'Milestone 2',
        percentage: 25,
        dueTrigger: 'on_prior_approved',
        type: 'milestone',
      },
      {
        label: 'Milestone 3',
        percentage: 25,
        dueTrigger: 'on_prior_approved',
        type: 'milestone',
      },
      {
        label: 'Final payment',
        percentage: 25,
        dueTrigger: 'on_prior_approved',
        type: 'final',
      },
    ],
  },
  {
    id: '100-upfront',
    label: '100% upfront',
    description: 'Full amount due on quote acceptance (small/fixed packages).',
    installments: [
      {
        label: 'Full payment',
        percentage: 100,
        dueTrigger: 'on_accept',
        type: 'fullPayment',
      },
    ],
  },
];

const PRESET_BY_ID = Object.fromEntries(PAYMENT_SCHEDULE_PRESETS.map((p) => [p.id, p])) as Record<
  PaymentSchedulePresetId,
  PaymentSchedulePresetDefinition
>;

export function getPaymentSchedulePreset(
  id: PaymentSchedulePresetId,
): PaymentSchedulePresetDefinition {
  const preset = PRESET_BY_ID[id];
  if (!preset) {
    throw new BusinessLogicException(`Unknown payment schedule preset: ${id}`, 'QUOTE_011');
  }
  return preset;
}

export function listPaymentSchedulePresets(): PaymentSchedulePresetDefinition[] {
  return PAYMENT_SCHEDULE_PRESETS;
}

/** Distributes totalAmount across percentage rows; last row absorbs rounding remainder. */
export function buildPaymentScheduleFromPreset(
  presetId: PaymentSchedulePresetId,
  totalAmountPaise: number,
): PaymentScheduleInstallment[] {
  if (totalAmountPaise <= 0) return [];

  const preset = getPaymentSchedulePreset(presetId);
  let allocated = 0;

  return preset.installments.map((row, index) => {
    const isLast = index === preset.installments.length - 1;
    const amountPaise = isLast
      ? totalAmountPaise - allocated
      : Math.round((totalAmountPaise * row.percentage) / 100);
    allocated += amountPaise;

    return {
      label: row.label,
      amountPaise,
      percentage: row.percentage,
      dueTrigger: row.dueTrigger,
      type: row.type,
      order: index + 1,
    };
  });
}

export type PaymentScheduleInputRow = {
  label: string;
  amountPaise?: number;
  amount?: number;
  percentage?: number;
  dueTrigger?: PaymentScheduleDueTrigger;
  dueDate?: string;
  type?: PaymentScheduleInstallment['type'];
};

/** Normalizes admin input (major units or paise) into stored schedule rows. */
export function normalizePaymentScheduleInput(
  rows: PaymentScheduleInputRow[],
  totalAmountPaise: number,
  amountInMajorUnits = false,
): PaymentScheduleInstallment[] {
  if (!rows.length) {
    throw new BusinessLogicException(
      'Payment schedule must have at least one installment',
      'QUOTE_012',
    );
  }

  const hasPercentages = rows.every((r) => typeof r.percentage === 'number' && r.percentage > 0);
  let allocated = 0;

  const installments: PaymentScheduleInstallment[] = rows.map((row, index) => {
    const label = row.label?.trim() || `Payment ${index + 1}`;
    const dueTrigger: PaymentScheduleDueTrigger =
      row.dueTrigger ?? (index === 0 ? 'on_accept' : 'on_prior_approved');

    let amountPaise = 0;
    if (hasPercentages) {
      const isLast = index === rows.length - 1;
      amountPaise = isLast
        ? totalAmountPaise - allocated
        : Math.round((totalAmountPaise * (row.percentage ?? 0)) / 100);
      allocated += amountPaise;
    } else if (typeof row.amountPaise === 'number') {
      amountPaise = Math.round(row.amountPaise);
    } else if (typeof row.amount === 'number') {
      amountPaise = amountInMajorUnits ? Math.round(row.amount * 100) : Math.round(row.amount);
    } else {
      throw new BusinessLogicException(
        `Installment "${label}" must specify amountPaise, amount, or use all percentages`,
        'QUOTE_012',
      );
    }

    return {
      label,
      amountPaise,
      percentage: row.percentage,
      dueTrigger,
      dueDate: row.dueDate,
      type:
        row.type ?? (index === 0 ? 'advance' : index === rows.length - 1 ? 'final' : 'milestone'),
      order: index + 1,
    };
  });

  validatePaymentSchedule(installments, totalAmountPaise);
  return installments;
}

export function validatePaymentSchedule(
  schedule: PaymentScheduleInstallment[],
  totalAmountPaise: number,
): void {
  if (!schedule.length) {
    throw new BusinessLogicException(
      'Payment schedule must have at least one installment',
      'QUOTE_012',
    );
  }

  if (schedule.length > 12) {
    throw new BusinessLogicException('Payment schedule cannot exceed 12 installments', 'QUOTE_012');
  }

  const sum = schedule.reduce((acc, row) => acc + (row.amountPaise ?? 0), 0);
  if (Math.abs(sum - totalAmountPaise) > ROUNDING_TOLERANCE_PAISE) {
    throw new BusinessLogicException(
      `Payment schedule total (${sum} paise) must equal quote total (${totalAmountPaise} paise)`,
      'QUOTE_012',
    );
  }

  // NL-BUG-QUOTE-005: when every installment carries a percentage, they must sum to 100
  // (a lone 30% row previously passed amount checks — last-row remainder filled the total).
  const allHavePct = schedule.every((row) => typeof row.percentage === 'number');
  if (allHavePct && schedule.length > 0) {
    const pctSum = schedule.reduce((acc, row) => acc + (row.percentage ?? 0), 0);
    if (Math.round(pctSum) !== 100) {
      throw new BusinessLogicException(
        `Payment schedule percentages must sum to 100 (got ${pctSum})`,
        'QUOTE_012',
      );
    }
  }

  for (const row of schedule) {
    if (!row.label?.trim()) {
      throw new BusinessLogicException('Each installment requires a label', 'QUOTE_012');
    }
    if (row.amountPaise <= 0) {
      throw new BusinessLogicException(
        `Installment "${row.label}" must have a positive amount`,
        'QUOTE_012',
      );
    }
    if (row.dueTrigger === 'on_date' && !row.dueDate) {
      throw new BusinessLogicException(
        `Installment "${row.label}" with on_date trigger requires dueDate`,
        'QUOTE_012',
      );
    }
  }

  if (schedule[0].dueTrigger !== 'on_accept') {
    throw new BusinessLogicException(
      'First installment must be payable on quote acceptance (on_accept)',
      'QUOTE_012',
    );
  }
}

type MilestoneTemplateRow = {
  name?: string;
  description?: string | null;
  amount?: number | null;
  percentage?: number | null;
  dueDate?: string | null;
};

type LegacyBreakdownRow = {
  milestone?: string;
  description?: string;
  amount?: number;
  percentage?: number;
  dueDate?: string;
  dueOn?: string;
  type?: string;
};

export function parseJsonArray<T>(field: unknown): T[] {
  if (!field) return [];
  if (Array.isArray(field)) return field as T[];
  if (typeof field === 'object') return [];
  try {
    const parsed = JSON.parse(String(field));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function legacyBreakdownToSchedule(
  rows: LegacyBreakdownRow[],
  totalAmountPaise: number,
): PaymentScheduleInstallment[] {
  const installments = rows
    .map((row, index): PaymentScheduleInstallment | null => {
      const amountPaise = resolveBreakdownAmountPaise(row);
      if (amountPaise <= 0) return null;
      const dueOn = String(row.dueOn ?? row.dueDate ?? '').toLowerCase();
      const dueTrigger: PaymentScheduleDueTrigger =
        index === 0 || dueOn.includes('accept') ? 'on_accept' : 'on_prior_approved';

      return {
        label: String(row.milestone ?? row.description ?? `Payment ${index + 1}`),
        amountPaise,
        percentage: typeof row.percentage === 'number' ? row.percentage : undefined,
        dueTrigger,
        dueDate: row.dueDate,
        type: (row.type as PaymentScheduleInstallment['type']) ?? undefined,
        order: index + 1,
      };
    })
    .filter((row): row is PaymentScheduleInstallment => row !== null);

  if (installments.length > 0) {
    validatePaymentSchedule(installments, totalAmountPaise);
  }
  return installments;
}

function milestoneTemplateToSchedule(
  template: MilestoneTemplateRow[],
  totalAmountPaise: number,
): PaymentScheduleInstallment[] {
  const rows: PaymentScheduleInputRow[] = template.map((item, index) => ({
    label: item.name?.trim() || `Milestone ${index + 1}`,
    amountPaise: item.amount != null ? Math.round(Number(item.amount)) : undefined,
    percentage: item.percentage != null ? Number(item.percentage) : undefined,
    dueTrigger: index === 0 ? 'on_accept' : 'on_prior_approved',
    dueDate: item.dueDate ?? undefined,
  }));

  const hasAmounts = rows.some((r) => (r.amountPaise ?? 0) > 0);
  const hasPercentages = rows.some((r) => (r.percentage ?? 0) > 0);

  if (!hasAmounts && !hasPercentages) return [];

  return normalizePaymentScheduleInput(rows, totalAmountPaise, false);
}

export type ResolveQuotePaymentScheduleParams = {
  totalAmountPaise: number;
  paymentSchedule?: unknown;
  paymentBreakdown?: unknown;
  timeline?: unknown;
  schedulePreset?: PaymentSchedulePresetId | string | null;
  /** When true, falls back to 50-50 preset instead of silent env default. */
  defaultPreset?: PaymentSchedulePresetId;
};

/**
 * Resolves the canonical payment schedule for milestone creation.
 * Priority: paymentSchedule → legacy installment breakdown → timeline template → preset.
 */
export function resolveQuotePaymentSchedule(
  params: ResolveQuotePaymentScheduleParams,
): PaymentScheduleInstallment[] {
  const { totalAmountPaise } = params;
  if (totalAmountPaise <= 0) return [];

  const explicit = parseJsonArray<PaymentScheduleInstallment>(params.paymentSchedule);
  if (explicit.length > 0) {
    validatePaymentSchedule(explicit, totalAmountPaise);
    return explicit.map((row, index) => ({ ...row, order: row.order ?? index + 1 }));
  }

  const breakdownRaw = parseJsonArray<LegacyBreakdownRow>(params.paymentBreakdown);
  if (breakdownRaw.length > 0 && !isQuoteLineItemBreakdown(breakdownRaw)) {
    const fromBreakdown = legacyBreakdownToSchedule(breakdownRaw, totalAmountPaise);
    if (fromBreakdown.length > 0) return fromBreakdown;
  }

  const timeline =
    params.timeline && typeof params.timeline === 'object'
      ? (params.timeline as Record<string, unknown>)
      : {};
  const template = parseJsonArray<MilestoneTemplateRow>(timeline.milestoneTemplate);
  if (template.length > 0) {
    const fromTemplate = milestoneTemplateToSchedule(template, totalAmountPaise);
    if (fromTemplate.length > 0) return fromTemplate;
  }

  const presetId = (params.schedulePreset ??
    params.defaultPreset ??
    '50-50') as PaymentSchedulePresetId;
  return buildPaymentScheduleFromPreset(presetId, totalAmountPaise);
}

/** Maps stored schedule rows to milestone/payment creation shape. */
export function paymentScheduleToMilestoneRows(
  schedule: PaymentScheduleInstallment[],
  targetEndDate: Date,
): Array<{
  name: string;
  description: string | null;
  amount: number;
  percentage: number | null;
  dueDate: Date;
  order: number;
}> {
  return schedule.map((row, index) => {
    // Honor an explicit installment dueDate for every trigger. on_accept used to
    // ignore it and fall through to quote validUntil, so deposit and final dates diverged.
    let dueDate = targetEndDate;
    if (row.dueDate) {
      const parsed = new Date(row.dueDate);
      if (!Number.isNaN(parsed.getTime())) dueDate = parsed;
    }

    return {
      name: row.label,
      description: row.label,
      amount: row.amountPaise,
      percentage: row.percentage ?? null,
      dueDate,
      order: row.order ?? index + 1,
    };
  });
}
