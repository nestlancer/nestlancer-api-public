import { sanitizeClientPaymentNotes } from '../../../src/payment/client-payment-notes';

describe('sanitizeClientPaymentNotes', () => {
  it('strips operator UUIDs from the default manual-payment note', () => {
    expect(
      sanitizeClientPaymentNotes(
        'Manual payment by admin b02c0b66-fbdc-4477-a86e-d8eda5233228',
      ),
    ).toBe('Recorded by support');
  });

  it('keeps client-facing transfer notes', () => {
    expect(sanitizeClientPaymentNotes('UTR: HDFC20260715001')).toBe('UTR: HDFC20260715001');
  });

  it('hides revision-overflow protocol payloads', () => {
    expect(
      sanitizeClientPaymentNotes('REVISION_OVERFLOW:{"reason":"More changes","userId":"user-1"}'),
    ).toBeNull();
  });
});
