import { getInvoiceTemplate } from '../../../src/templates/invoice.template';

describe('InvoiceTemplate', () => {
  it('should format money correctly in INR', () => {
    const result = getInvoiceTemplate({ totalPaise: 150000 });
    expect(result).toContain('₹1,500.00');
  });

  it('labels CGST/SGST from the stored rate, not a hardcoded 9%', () => {
    const zeroTax = getInvoiceTemplate({ totalPaise: 100000, subtotalPaise: 100000, taxPaise: 0 });
    expect(zeroTax).toContain('CGST @ 0%');
    expect(zeroTax).toContain('SGST @ 0%');
    expect(zeroTax).not.toContain('CGST @ 9%');

    const twelve = getInvoiceTemplate({
      totalPaise: 112000,
      subtotalPaise: 100000,
      taxPaise: 12000,
      taxRate: 12,
      cgstPaise: 6000,
      sgstPaise: 6000,
    });
    expect(twelve).toContain('CGST @ 6%');
    expect(twelve).toContain('SGST @ 6%');
    expect(twelve).not.toContain('CGST @ 9%');
  });

  it('should render items correctly', () => {
    const result = getInvoiceTemplate({
      items: [{ description: 'Test Item', quantity: 2, unitPricePaise: 5000, totalPaise: 10000 }],
    });
    expect(result).toContain('Test Item');
    expect(result).toContain('100.00');
    // Do not invent 18% GST when the caller did not supply a tax rate.
    expect(result).not.toContain('118.00');
    expect(result).toContain('>0%<');
  });

  it('should render company and client info', () => {
    const result = getInvoiceTemplate({
      company: { name: 'MyCompany' },
      client: { name: 'MyClient' },
    });
    expect(result).toContain('MyCompany');
    expect(result).toContain('MyClient');
  });

  it('should default missing values gracefully', () => {
    const result = getInvoiceTemplate({});
    expect(result).toContain('Nestlancer');
    expect(result).toContain('INV-000');
    expect(result).toContain('class="watermark"');
    expect(result).toContain('data:image/svg+xml;base64,');
  });

  it('should keep disclaimer in the closing block on the same page flow', () => {
    const result = getInvoiceTemplate({});
    expect(result).toContain('doc-invoice');
    expect(result).toContain('document-closing');
    expect(result).toContain('footer-note');
    expect(result).toContain('This is a computer-generated tax invoice.');
    expect(result).toContain('run-header--compact');
  });

  it('should render payment engagement sections when context is provided', () => {
    const result = getInvoiceTemplate({
      totalPaise: 265500,
      subtotalPaise: 225000,
      taxPaise: 40500,
      currency: 'INR',
      paymentContext: {
        paymentId: 'pay-1',
        paymentStatus: 'COMPLETED',
        transactionRef: 'UTR123',
        engagement: {
          projectId: 'proj-1',
          projectTitle: 'Khandesh Spice D2C Store',
          contractReference: 'QT-2026-001',
          quoteNumber: 'QT-2026-001',
          currentPhaseLabel: 'Phase 1 of 3 · Deposit',
          paymentSequenceLabel: 'Payment 1 of 3',
          contractValuePaise: 7500000,
          totalPaidPaise: 2250000,
          totalPendingPaise: 5250000,
          completedPaymentsCount: 1,
          schedulePaymentsCount: 3,
        },
        paymentSchedule: [
          {
            sequence: 1,
            name: 'Deposit',
            amountPaise: 2250000,
            status: 'paid',
            statusLabel: 'Paid',
            transactionRef: 'NL-RCPT-2026-000003',
            receiptNumber: 'NL-RCPT-2026-000003',
            isCurrent: true,
          },
          {
            sequence: 2,
            name: 'Mid-project payment',
            amountPaise: 3000000,
            status: 'pending',
            statusLabel: 'Pending',
            isCurrent: false,
          },
        ],
        transactionHistory: [
          {
            sequence: 1,
            date: '2026-07-30T13:52:43.508Z',
            amountPaise: 2250000,
            milestoneName: 'Deposit',
            transactionRef: 'NL-RCPT-2026-000003',
            receiptNumber: 'NL-RCPT-2026-000003',
            invoiceNumber: 'INV-NL-2026-0042',
            paymentId: 'pay-1',
            isCurrent: true,
          },
        ],
      },
    });
    expect(result).toContain('Project &amp; payment engagement');
    expect(result).toContain('Project payment schedule');
    expect(result).toContain('Payment 1 of 3');
    expect(result).toContain('Contract / quote no.');
    expect(result).toContain('Mid-project payment');
    expect(result).toContain('Transaction history');
    expect(result).toContain('NL-RCPT-2026-000003');
    expect(result).toContain('INV-NL-2026-0042');
    expect(result).not.toContain('Rcpt NL-RCPT');
  });
});
