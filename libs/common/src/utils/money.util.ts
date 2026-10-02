import { CURRENCY_SUBUNIT_MULTIPLIER, CURRENCY_SYMBOL } from '../constants/currency.constants';

/** Converts rupees to paise (stored as integers in DB) */
export function toPaise(rupees: number): number {
  return Math.round(rupees * CURRENCY_SUBUNIT_MULTIPLIER);
}

/** Converts paise to rupees for display */
export function toRupees(paise: number): number {
  return paise / CURRENCY_SUBUNIT_MULTIPLIER;
}

/** Formats paise as human-readable INR string */
export function formatINR(paise: number): string {
  const rupees = toRupees(paise);
  return `${CURRENCY_SYMBOL}${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Validates that an amount in paise is positive and within bounds */
export function isValidAmount(paise: number): boolean {
  return Number.isInteger(paise) && paise > 0;
}

/**
 * Split a tax-inclusive installment into subtotal + tax using the quote's tax percentage.
 * A 0% quote must not invent GST (invoice templates used to add a flat 18%).
 */
export function splitInclusiveTaxPaise(
  amountPaise: number,
  taxPercentage: number,
): { subtotalPaise: number; taxPaise: number; taxPercentage: number } {
  const amount = Math.max(0, Math.round(amountPaise || 0));
  const pct = Number.isFinite(taxPercentage) && taxPercentage > 0 ? taxPercentage : 0;
  if (pct <= 0 || amount <= 0) {
    return { subtotalPaise: amount, taxPaise: 0, taxPercentage: 0 };
  }
  const taxPaise = Math.round((amount * pct) / (100 + pct));
  return {
    subtotalPaise: amount - taxPaise,
    taxPaise,
    taxPercentage: pct,
  };
}

/**
 * NL-PAY-014: Resolve manual payment amount in paise.
 * Detects classic major-units mistake (operator typed ₹2000 → stored as 2000 paise = ₹20)
 * when the value is exactly scheduleAmount / 100.
 *
 * Explicit body amounts that are non-positive or non-numeric return 0 (caller must reject).
 * Omitted body amount falls back to existing payment row, then milestone schedule.
 */
export function resolveManualPaymentAmountPaise(opts: {
  bodyAmount?: unknown;
  existingAmount?: number | null;
  milestoneAmount: number;
}): number {
  const schedule = Math.max(0, Math.round(opts.milestoneAmount ?? 0));
  const bodyProvided = opts.bodyAmount !== undefined && opts.bodyAmount !== null;

  if (bodyProvided) {
    if (
      typeof opts.bodyAmount !== 'number' ||
      !Number.isFinite(opts.bodyAmount) ||
      opts.bodyAmount <= 0
    ) {
      return 0;
    }
    const candidate = Math.round(opts.bodyAmount);
    // Classic 100× understatement: typed rupees into a paise field.
    if (
      schedule > 0 &&
      candidate < schedule &&
      candidate * CURRENCY_SUBUNIT_MULTIPLIER === schedule
    ) {
      return schedule;
    }
    return candidate;
  }

  let candidate: number | null = null;
  if (
    typeof opts.existingAmount === 'number' &&
    Number.isFinite(opts.existingAmount) &&
    opts.existingAmount > 0
  ) {
    candidate = Math.round(opts.existingAmount);
  }

  if (candidate == null || candidate <= 0) {
    return schedule;
  }

  // Classic 100× understatement on a corrupted existing row.
  if (
    schedule > 0 &&
    candidate < schedule &&
    candidate * CURRENCY_SUBUNIT_MULTIPLIER === schedule
  ) {
    return schedule;
  }

  return candidate;
}
