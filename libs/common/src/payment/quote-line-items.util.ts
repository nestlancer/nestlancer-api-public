import { toPaise } from '../utils/money.util';

export type QuoteLineItemInput = {
  description: string;
  quantity: number;
  /** Unit price in major currency units (e.g. rupees). Converted to paise for storage. */
  unitPrice: number;
};

export type QuoteLineItemStored = {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type QuoteTotalsPaise = {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentBreakdown: QuoteLineItemStored[];
};

/** Computes quote totals in paise from admin line items entered in major units. */
export function computeQuoteTotalsPaise(
  items: QuoteLineItemInput[],
  taxPercentage: number,
): QuoteTotalsPaise {
  const subtotalPaise = items.reduce(
    (sum, item) => sum + toPaise(item.quantity * item.unitPrice),
    0,
  );
  const taxAmountPaise = Math.round(subtotalPaise * (Math.max(0, taxPercentage) / 100));
  const totalAmountPaise = subtotalPaise + taxAmountPaise;
  const paymentBreakdown = items.map((item) => {
    const unitPricePaise = toPaise(item.unitPrice);
    const totalPricePaise = toPaise(item.quantity * item.unitPrice);
    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: unitPricePaise,
      totalPrice: totalPricePaise,
    };
  });

  return {
    subtotal: subtotalPaise,
    taxAmount: taxAmountPaise,
    totalAmount: totalAmountPaise,
    paymentBreakdown,
  };
}

type BreakdownRow = {
  amount?: number;
  totalPrice?: number;
  unitPrice?: number;
  quantity?: number;
  milestone?: string;
  description?: string;
};

/** Resolves a schedule/line-item row amount in paise. */
export function resolveBreakdownAmountPaise(item: BreakdownRow): number {
  if (typeof item.amount === 'number' && item.amount > 0) {
    return Math.round(item.amount);
  }
  if (typeof item.totalPrice === 'number' && item.totalPrice > 0) {
    return Math.round(item.totalPrice);
  }
  const qty = Math.max(1, Number(item.quantity) || 1);
  const unit = Number(item.unitPrice) || 0;
  if (unit > 0) {
    return Math.round(qty * unit);
  }
  return 0;
}

/** True when breakdown rows are billing line items (not payment-milestone schedule). */
export function isQuoteLineItemBreakdown(raw: unknown): boolean {
  if (!Array.isArray(raw) || raw.length === 0) return false;
  return raw.some(
    (row) =>
      row &&
      typeof row === 'object' &&
      ('unitPrice' in (row as object) || 'totalPrice' in (row as object)),
  );
}
