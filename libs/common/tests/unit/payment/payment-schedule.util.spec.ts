import {
  buildPaymentScheduleFromPreset,
  normalizePaymentScheduleInput,
  paymentScheduleToMilestoneRows,
  resolveQuotePaymentSchedule,
  validatePaymentSchedule,
} from '../../../src/payment/payment-schedule.util';
import { BusinessLogicException } from '../../../src/exceptions/business-logic.exception';

describe('payment-schedule.util', () => {
  const total = 100_000; // ₹1,000 in paise

  it('keeps an explicit dueDate on on_accept installments', () => {
    const targetEnd = new Date('2026-10-12T00:00:00.000Z');
    const rows = paymentScheduleToMilestoneRows(
      [
        {
          label: 'Deposit',
          amountPaise: 50_000,
          percentage: 50,
          dueTrigger: 'on_accept',
          dueDate: '2026-09-15T00:00:00.000Z',
          order: 1,
        },
        {
          label: 'Final payment',
          amountPaise: 50_000,
          percentage: 50,
          dueTrigger: 'on_date',
          dueDate: '2026-09-29T00:00:00.000Z',
          order: 2,
        },
      ],
      targetEnd,
    );
    expect(rows[0].dueDate.toISOString()).toBe('2026-09-15T00:00:00.000Z');
    expect(rows[1].dueDate.toISOString()).toBe('2026-09-29T00:00:00.000Z');
  });

  it('builds 50-50 preset summing to total', () => {
    const schedule = buildPaymentScheduleFromPreset('50-50', total);
    expect(schedule).toHaveLength(2);
    expect(schedule[0].amountPaise + schedule[1].amountPaise).toBe(total);
    expect(schedule[0].dueTrigger).toBe('on_accept');
  });

  it('builds 30-40-30 preset with three installments', () => {
    const schedule = buildPaymentScheduleFromPreset('30-40-30', total);
    expect(schedule).toHaveLength(3);
    expect(schedule.reduce((s, r) => s + r.amountPaise, 0)).toBe(total);
  });

  it('validates custom percentage schedule', () => {
    const schedule = normalizePaymentScheduleInput(
      [
        { label: 'Deposit', percentage: 30, dueTrigger: 'on_accept' },
        { label: 'Final', percentage: 70, dueTrigger: 'on_prior_approved' },
      ],
      total,
    );
    expect(schedule[0].amountPaise).toBe(30_000);
    expect(schedule[1].amountPaise).toBe(70_000);
  });

  it('rejects schedule that does not sum to total', () => {
    expect(() =>
      validatePaymentSchedule(
        [
          { label: 'A', amountPaise: 40_000, dueTrigger: 'on_accept' },
          { label: 'B', amountPaise: 40_000, dueTrigger: 'on_prior_approved' },
        ],
        total,
      ),
    ).toThrow(BusinessLogicException);
  });

  it('prefers explicit paymentSchedule over line-item breakdown fallback', () => {
    const schedule = resolveQuotePaymentSchedule({
      totalAmountPaise: total,
      paymentSchedule: [
        { label: 'Deposit', amountPaise: 25_000, dueTrigger: 'on_accept' },
        { label: 'Final', amountPaise: 75_000, dueTrigger: 'on_prior_approved' },
      ],
      paymentBreakdown: [
        { description: 'Design', quantity: 1, unitPrice: 50000, totalPrice: 50000 },
      ],
    });
    expect(schedule).toHaveLength(2);
    expect(schedule[0].amountPaise).toBe(25_000);
  });

  it('falls back to preset when only line items exist', () => {
    const schedule = resolveQuotePaymentSchedule({
      totalAmountPaise: total,
      paymentBreakdown: [
        { description: 'Design', quantity: 1, unitPrice: 50000, totalPrice: 50000 },
      ],
      schedulePreset: '30-70',
    });
    expect(schedule).toHaveLength(2);
    expect(schedule[0].amountPaise).toBe(30_000);
    expect(schedule[1].amountPaise).toBe(70_000);
  });
});
