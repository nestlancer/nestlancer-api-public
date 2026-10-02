import {
  toPaise,
  toRupees,
  formatINR,
  isValidAmount,
  resolveManualPaymentAmountPaise,
  splitInclusiveTaxPaise,
} from '../../../src/utils/money.util';

describe('MoneyUtils', () => {
  describe('toPaise', () => {
    it('should convert rupees to paise', () => {
      expect(toPaise(10.5)).toBe(1050);
      expect(toPaise(0.99)).toBe(99);
    });

    it('should handle floating point rounding', () => {
      expect(toPaise(1.1)).toBe(110);
      expect(toPaise(1.005)).toBe(100);
    });
  });

  describe('toRupees', () => {
    it('should convert paise to rupees', () => {
      expect(toRupees(1050)).toBe(10.5);
      expect(toRupees(99)).toBe(0.99);
    });
  });

  describe('formatINR', () => {
    it('should format paise as INR string', () => {
      expect(formatINR(100000)).toBe('₹1,000.00');
      expect(formatINR(5050)).toBe('₹50.50');
    });
  });

  describe('splitInclusiveTaxPaise', () => {
    it('does not invent GST when the quote tax rate is 0', () => {
      expect(splitInclusiveTaxPaise(200000, 0)).toEqual({
        subtotalPaise: 200000,
        taxPaise: 0,
        taxPercentage: 0,
      });
    });

    it('extracts inclusive tax without adding a second 18%', () => {
      const split = splitInclusiveTaxPaise(11800, 18);
      expect(split.taxPercentage).toBe(18);
      expect(split.subtotalPaise + split.taxPaise).toBe(11800);
    });
  });

  describe('isValidAmount', () => {
    it('should validate positive integers', () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(1)).toBe(true);
    });

    it('should reject non-integers and non-positive numbers', () => {
      expect(isValidAmount(10.5)).toBe(false);
      expect(isValidAmount(0)).toBe(false);
      expect(isValidAmount(-100)).toBe(false);
    });
  });

  describe('resolveManualPaymentAmountPaise', () => {
    it('uses milestone amount when body amount omitted', () => {
      expect(
        resolveManualPaymentAmountPaise({
          milestoneAmount: 200000,
        }),
      ).toBe(200000);
    });

    it('corrects classic major-units mistake (NL-PAY-014)', () => {
      expect(
        resolveManualPaymentAmountPaise({
          bodyAmount: 2000,
          milestoneAmount: 200000,
        }),
      ).toBe(200000);
    });

    it('heals corrupted existing amount when body omitted', () => {
      expect(
        resolveManualPaymentAmountPaise({
          existingAmount: 2000,
          milestoneAmount: 200000,
        }),
      ).toBe(200000);
    });

    it('keeps explicit paise amount when not a 100x understatement', () => {
      expect(
        resolveManualPaymentAmountPaise({
          bodyAmount: 200000,
          milestoneAmount: 200000,
        }),
      ).toBe(200000);
    });

    it('returns 0 for explicit non-positive body amount (caller must reject)', () => {
      expect(
        resolveManualPaymentAmountPaise({
          bodyAmount: 0,
          milestoneAmount: 200000,
        }),
      ).toBe(0);
      expect(
        resolveManualPaymentAmountPaise({
          bodyAmount: -500,
          milestoneAmount: 200000,
        }),
      ).toBe(0);
    });

    it('returns 0 when omitted amount and zero milestone schedule (caller must reject)', () => {
      expect(
        resolveManualPaymentAmountPaise({
          milestoneAmount: 0,
        }),
      ).toBe(0);
    });
  });
});
