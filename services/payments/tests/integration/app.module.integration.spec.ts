import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { PaymentsController } from '../../src/controllers/user/payments.controller';
import { PaymentMethodsController } from '../../src/controllers/user/payment-methods.controller';
import { PaymentsAdminController } from '../../src/controllers/admin/payments.admin.controller';
import { PaymentMilestonesAdminController } from '../../src/controllers/admin/payment-milestones.admin.controller';
import { PaymentDisputesAdminController } from '../../src/controllers/admin/payment-disputes.admin.controller';
import { RazorpayWebhookController } from '../../src/controllers/webhooks/razorpay-webhook.controller';
import { PaymentsService } from '../../src/services/payments.service';

function loadDevEnv() {
  const envPath = resolve(__dirname, '../../../../.env.development');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...value] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = value
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });
}

describe('AppModule (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'development';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [Reflector],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should resolve user payments controllers', () => {
    const paymentsController = app.get(PaymentsController);
    const paymentMethodsController = app.get(PaymentMethodsController);
    expect(paymentsController).toBeDefined();
    expect(paymentsController).toBeInstanceOf(PaymentsController);
    expect(paymentMethodsController).toBeInstanceOf(PaymentMethodsController);
  });

  it('should resolve admin payments controllers', () => {
    const paymentsAdminController = app.get(PaymentsAdminController);
    const paymentMilestonesAdminController = app.get(PaymentMilestonesAdminController);
    const paymentDisputesAdminController = app.get(PaymentDisputesAdminController);
    expect(paymentsAdminController).toBeInstanceOf(PaymentsAdminController);
    expect(paymentMilestonesAdminController).toBeInstanceOf(PaymentMilestonesAdminController);
    expect(paymentDisputesAdminController).toBeInstanceOf(PaymentDisputesAdminController);
  });

  it('should resolve webhook controller', () => {
    const razorpayWebhookController = app.get(RazorpayWebhookController);
    expect(razorpayWebhookController).toBeDefined();
    expect(razorpayWebhookController).toBeInstanceOf(RazorpayWebhookController);
  });

  it('should resolve PaymentsService as dependency of payments controllers', () => {
    const paymentsService = app.get(PaymentsService);
    expect(paymentsService).toBeDefined();
    expect(paymentsService).toBeInstanceOf(PaymentsService);
  });
});
