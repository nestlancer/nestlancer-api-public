import { BusinessLogicException } from '@nestlancer/common';
import { PlatformPaymentAccountType } from '@prisma/client';

import { PlatformPaymentAccountService } from '../../../src/services/platform-payment-account.service';

describe('PlatformPaymentAccountService.toCompanyBankFields', () => {
  const service = new PlatformPaymentAccountService({} as any, {} as any, {} as any);

  it('maps account fields for invoice branding', () => {
    expect(
      service.toCompanyBankFields({
        bankName: 'HDFC',
        accountNumber: '123',
        ifsc: 'HDFC0001',
        upiVpa: 'pay@upi',
      }),
    ).toEqual({
      bankName: 'HDFC',
      accountNumber: '123',
      ifsc: 'HDFC0001',
      upi: 'pay@upi',
    });
  });
});

describe('PlatformPaymentAccountService validation', () => {
  const service = new PlatformPaymentAccountService({} as any, {} as any, {} as any);

  it('requires bank fields for BANK type', () => {
    expect(() =>
      (service as any).validateAccountFields(PlatformPaymentAccountType.BANK, {
        accountNumber: '',
        ifsc: '',
        upiVpa: null,
      }),
    ).toThrow(BusinessLogicException);
  });

  it('requires VPA for UPI type', () => {
    expect(() =>
      (service as any).validateAccountFields(PlatformPaymentAccountType.UPI, {
        accountNumber: null,
        ifsc: null,
        upiVpa: '',
      }),
    ).toThrow(BusinessLogicException);
  });

  it('accepts BOTH when bank and UPI present', () => {
    expect(() =>
      (service as any).validateAccountFields(PlatformPaymentAccountType.BOTH, {
        accountNumber: '1',
        ifsc: 'IFSC',
        upiVpa: 'a@upi',
      }),
    ).not.toThrow();
  });
});
