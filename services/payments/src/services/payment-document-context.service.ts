import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaymentDocumentContext } from '@nestlancer/documents';
import { PrismaReadService } from '@nestlancer/database';
import { PlatformPaymentAccountService } from './platform-payment-account.service';
import { CompanyLegalProfileService } from './company-legal-profile.service';

@Injectable()
export class PaymentDocumentContextService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly platformAccounts: PlatformPaymentAccountService,
    private readonly companyLegal: CompanyLegalProfileService,
  ) {}

  async buildForPayment(paymentId: string) {
    const context = await buildPaymentDocumentContext(this.prismaRead, paymentId);
    if (!context) throw new NotFoundException('Payment not found');
    return context;
  }

  async companyBlock() {
    // NL-BUG-PDF-001: legal identity from DB (blank when unset); bank/UPI from settlement accounts.
    const branding = await this.companyLegal.toCompanyBranding();
    const account = await this.platformAccounts.getPrimaryOrFirstActive();
    if (account) {
      const bank = this.platformAccounts.toCompanyBankFields(account);
      return { ...branding, ...bank };
    }
    return {
      ...branding,
      bankName: '',
      accountNumber: '',
      ifsc: '',
      upi: '',
    };
  }
}
