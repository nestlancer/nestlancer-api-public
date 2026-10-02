import { Module } from '@nestjs/common';
import { NestlancerConfigModule } from '@nestlancer/config';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { LoggerModule } from '@nestlancer/logger';
import { DatabaseModule } from '@nestlancer/database';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { StorageModule } from '@nestlancer/storage';
import { OutboxModule } from '@nestlancer/outbox';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { QueueModule } from '@nestlancer/queue';
import { CacheModule } from '@nestlancer/cache';
import { PdfModule, PdfService } from '@nestlancer/pdf';
import { DocumentsModule } from '@nestlancer/documents';
import { PaymentCompletionService } from '@nestlancer/common';
import paymentsConfig from './config/payments.config';

import { PaymentsController } from './controllers/user/payments.controller';
import { PaymentMethodsController } from './controllers/user/payment-methods.controller';
import { InvoicesController } from './controllers/user/invoices.controller';
import { PaymentDocumentsController } from './controllers/user/documents.controller';
import { PaymentsAdminController } from './controllers/admin/payments.admin.controller';
import { PaymentMilestonesAdminController } from './controllers/admin/payment-milestones.admin.controller';
import { PaymentDisputesAdminController } from './controllers/admin/payment-disputes.admin.controller';
import { PlatformPaymentAccountsAdminController } from './controllers/admin/platform-payment-accounts.admin.controller';
import { CompanyLegalProfileAdminController } from './controllers/admin/company-legal-profile.admin.controller';
import { RazorpayWebhookController } from './controllers/webhooks/razorpay-webhook.controller';

import {
  PaymentsService,
  PaymentIntentService,
  PaymentConfirmationService,
  PaymentEnforcementService,
  PaymentReconciliationSchedulerService,
  RazorpayService,
  RefundService,
  RazorpayWebhookService,
  PaymentMethodsService,
  PaymentMilestonesService,
  ReceiptPdfService,
  InvoicePdfService,
  PaymentDocumentContextService,
  PaymentDisputesService,
  PaymentReconciliationService,
  PaymentStatsService,
  PaymentGatingService,
  PaymentReminderSchedulerService,
  PaymentNotificationService,
  PlatformPaymentAccountService,
  CompanyLegalProfileService,
  BankTransferPaymentService,
} from './services';
import { ProgressProxyService } from './services/progress-proxy.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    AuthLibModule,
    StorageModule.forRoot(),
    OutboxModule.forRoot(),
    QueueModule.forRoot(),
    CacheModule.forRoot(),
    PdfModule,
    DocumentsModule,
    NestConfigModule.forFeature(paymentsConfig),
  ],
  controllers: [
    // Register before PaymentsController so GET payments/methods is not captured by :id
    PaymentMethodsController,
    PaymentsController,
    InvoicesController,
    PaymentDocumentsController,
    // Register before PaymentsAdminController so GET admin/payments/disputes|accounts is not captured by :id
    PaymentDisputesAdminController,
    PaymentMilestonesAdminController,
    PlatformPaymentAccountsAdminController,
    CompanyLegalProfileAdminController,
    PaymentsAdminController,
    RazorpayWebhookController,
  ],
  providers: [
    PaymentsService,
    PaymentIntentService,
    PaymentConfirmationService,
    PaymentCompletionService,
    PaymentEnforcementService,
    PaymentReconciliationSchedulerService,
    RazorpayService,
    RefundService,
    RazorpayWebhookService,
    PaymentMethodsService,
    PaymentMilestonesService,
    ReceiptPdfService,
    InvoicePdfService,
    PaymentDocumentContextService,
    PaymentDisputesService,
    PaymentReconciliationService,
    PaymentStatsService,
    PaymentGatingService,
    PaymentReminderSchedulerService,
    PaymentNotificationService,
    PlatformPaymentAccountService,
    CompanyLegalProfileService,
    BankTransferPaymentService,
    ProgressProxyService,
    PdfService,
  ],
})
export class AppModule {}
