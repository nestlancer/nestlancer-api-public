export type PaymentBreakdownItem = {
  milestone?: string;
  description?: string;
  amount?: number;
  percentage?: number;
  dueDate?: string;
  dueOn?: string;
};

export type DefaultSplitConfig = {
  upfrontPercent: number;
  finalPercent: number;
};

export const DEFAULT_PAYMENT_SPLIT: DefaultSplitConfig = {
  upfrontPercent: 50,
  finalPercent: 50,
};

/**
 * Builds a two-phase payment breakdown when the quote has no explicit schedule.
 */
export function buildDefaultPaymentBreakdown(
  totalAmount: number,
  config: DefaultSplitConfig = DEFAULT_PAYMENT_SPLIT,
): PaymentBreakdownItem[] {
  if (totalAmount <= 0) return [];

  const upfrontPercent = config.upfrontPercent;
  const finalPercent = config.finalPercent || 100 - upfrontPercent;
  const upfront = Math.round((totalAmount * upfrontPercent) / 100);
  const finalAmount = totalAmount - upfront;

  return [
    {
      description: 'Initial Payment',
      milestone: 'Initial Payment',
      amount: upfront,
      percentage: upfrontPercent,
      dueOn: 'Upon acceptance',
    },
    {
      description: 'Final Payment',
      milestone: 'Final Payment',
      amount: finalAmount,
      percentage: finalPercent,
      dueOn: 'Upon completion',
    },
  ];
}
