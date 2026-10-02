/** Default payment terms applied when quote.paymentTerms is unset. */
export const DEFAULT_PAYMENT_TERMS = {
  milestonePaymentDueDays: 3,
  lateFeePercent: 5,
  suspensionAfterDays: 14,
  reminderDays: [1, 3, 7, 14] as const,
};

export type PaymentTerms = {
  milestonePaymentDueDays?: number;
  lateFeePercent?: number;
  suspensionAfterDays?: number;
};

export function resolvePaymentTerms(raw: unknown): Required<PaymentTerms> {
  const terms = (raw && typeof raw === 'object' ? raw : {}) as PaymentTerms;
  return {
    milestonePaymentDueDays:
      terms.milestonePaymentDueDays ?? DEFAULT_PAYMENT_TERMS.milestonePaymentDueDays,
    lateFeePercent: terms.lateFeePercent ?? DEFAULT_PAYMENT_TERMS.lateFeePercent,
    suspensionAfterDays: terms.suspensionAfterDays ?? DEFAULT_PAYMENT_TERMS.suspensionAfterDays,
  };
}
