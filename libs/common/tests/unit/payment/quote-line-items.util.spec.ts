import {
  computeQuoteTotalsPaise,
  isQuoteLineItemBreakdown,
  resolveBreakdownAmountPaise,
} from '../../../src/payment/quote-line-items.util';

describe('quote-line-items.util', () => {
  describe('computeQuoteTotalsPaise', () => {
    it('converts major-unit line items to paise totals', () => {
      const result = computeQuoteTotalsPaise(
        [{ description: 'Discovery', quantity: 1, unitPrice: 5000 }],
        18,
      );
      expect(result.subtotal).toBe(500_000);
      expect(result.taxAmount).toBe(90_000);
      expect(result.totalAmount).toBe(590_000);
      expect(result.paymentBreakdown[0]).toEqual({
        description: 'Discovery',
        quantity: 1,
        unitPrice: 500_000,
        totalPrice: 500_000,
      });
    });
  });

  describe('resolveBreakdownAmountPaise', () => {
    it('reads amount, totalPrice, or quantity * unitPrice', () => {
      expect(resolveBreakdownAmountPaise({ amount: 295_000 })).toBe(295_000);
      expect(resolveBreakdownAmountPaise({ totalPrice: 500_000 })).toBe(500_000);
      expect(resolveBreakdownAmountPaise({ quantity: 2, unitPrice: 100_000 })).toBe(200_000);
    });
  });

  describe('isQuoteLineItemBreakdown', () => {
    it('detects line-item rows vs payment schedule rows', () => {
      expect(isQuoteLineItemBreakdown([{ description: 'A', quantity: 1, unitPrice: 100 }])).toBe(
        true,
      );
      expect(isQuoteLineItemBreakdown([{ milestone: 'Deposit', amount: 100 }])).toBe(false);
    });
  });
});
