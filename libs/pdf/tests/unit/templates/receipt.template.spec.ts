import { getReceiptTemplate } from '../../../src/templates/receipt.template';

describe('Receipt Template', () => {
  it('should render a valid HTML receipt with basic data', () => {
    const data = {
      receiptNumber: 'RCT-1234',
      amountPaise: 50000,
      currency: 'USD',
      company: { name: 'TestCompany', address: '123 Test St' },
      client: { name: 'John Doe', email: 'john@example.com' },
      paymentMethod: 'Credit Card',
      transactionId: 'txn_9876',
    };

    const html = getReceiptTemplate(data);
    expect(html).toContain('TestCompany');
    expect(html).toContain('RCT-1234');
    expect(html).toContain('John Doe');
    expect(html).toContain('USD 500.00');
    expect(html).toContain('txn_9876');
  });

  it('should gracefully handle missing optional fields', () => {
    const html = getReceiptTemplate({});
    expect(html).toContain('Nestlancer'); // Default company
    expect(html).toContain('RCT-000'); // Default receipt
    expect(html).toContain('₹0.00'); // Default amount
    expect(html).toContain('Payment Received');
  });

  it('should render receipt engagement and schedule sections', () => {
    const html = getReceiptTemplate({
      receiptNumber: 'RCT-1234',
      amountPaise: 2250000,
      currency: 'INR',
      company: { name: 'TestCompany' },
      client: { name: 'John Doe' },
      paymentContext: {
        paymentId: 'pay-1',
        paymentStatus: 'COMPLETED',
        transactionRef: 'UTR123',
        paymentMethod: 'manual',
        engagement: {
          projectId: '019fb34c-71c6-77ee-8049-3d426c81a6c1',
          projectTitle: 'Khandesh Spice D2C Store',
          contractReference: 'QT-2026-001',
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
            isCurrent: true,
          },
        ],
        transactionHistory: [],
      },
    });
    expect(html).toContain('Transaction details');
    expect(html).toContain('Payment 1 of 3');
    expect(html).toContain('Project payment schedule');
  });
});
