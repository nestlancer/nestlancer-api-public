import { getQuoteTemplate } from '../../../src/templates/quote.template';

describe('QuoteTemplate', () => {
  it('should format money correctly in USD', () => {
    const result = getQuoteTemplate({ totalPaise: 250000, currency: 'USD' });
    expect(result).toContain('USD 2500.00');
  });

  it('should render items correctly', () => {
    const result = getQuoteTemplate({
      items: [
        { description: 'Consulting', quantity: 10, unitPricePaise: 100000, totalPaise: 1000000 },
      ],
    });
    expect(result).toContain('Consulting');
    expect(result).toContain('10');
    expect(result).toContain('1,000.00');
    expect(result).toContain('10,000.00');
  });

  it('should render standard and project-specific terms separately', () => {
    const result = getQuoteTemplate({
      terms: 'Standard platform terms',
      termsAndConditions: 'Custom milestone payment clause',
    });
    expect(result).toContain('Standard Terms');
    expect(result).toContain('Standard platform terms');
    expect(result).toContain('Project-Specific Terms');
    expect(result).toContain('Custom milestone payment clause');
  });

  it('should render legacy terms-only quotes', () => {
    const result = getQuoteTemplate({
      terms: 'Net 30',
    });
    expect(result).toContain('Terms &amp; Conditions');
    expect(result).toContain('Net 30');
  });

  it('should render legacy termsAndConditions-only quotes', () => {
    const result = getQuoteTemplate({
      termsAndConditions: 'Client-facing legal terms',
    });
    expect(result).toContain('Client-facing legal terms');
  });

  it('should render payment schedule installments', () => {
    const result = getQuoteTemplate({
      currency: 'INR',
      paymentSchedule: [
        {
          order: 1,
          label: 'Deposit',
          percentage: 30,
          amountPaise: 4425000,
          dueTrigger: 'on_accept',
        },
        {
          order: 2,
          label: 'Final payment',
          percentage: 70,
          amountPaise: 10325000,
          dueTrigger: 'on_prior_approved',
        },
      ],
    });
    expect(result).toContain('Payment Schedule');
    expect(result).toContain('Deposit');
    expect(result).toContain('44,250.00');
    expect(result).toContain('On quote acceptance');
  });

  it('should include document title in html head', () => {
    const result = getQuoteTemplate({ quoteNumber: 'NL-QTE-2026-000017' });
    expect(result).toContain('<title>Quotation NL-QTE-2026-000017</title>');
  });

  it('should default missing values gracefully', () => {
    const result = getQuoteTemplate({});
    expect(result).toContain('Nestlancer');
    expect(result).toContain('QTE-000');
  });
});
