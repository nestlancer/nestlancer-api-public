import { Module } from '@nestjs/common';
import { NestlancerConfigModule } from '@nestlancer/config';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { DatabaseModule } from '@nestlancer/database';
import { QueueModule } from '@nestlancer/queue';
import { OutboxModule } from '@nestlancer/outbox';
import { CacheModule } from '@nestlancer/cache';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { IdempotencyModule } from '@nestlancer/idempotency';

import authConfig from './config/auth.config';
import { AuthPublicController } from './controllers/auth.public.controller';
import { AuthService } from './services/auth.service';
import { RegistrationService } from './services/registration.service';
import { LoginService } from './services/login.service';
import { TokenService } from './services/token.service';
import { PasswordService } from './services/password.service';
import { TwoFactorService } from './services/two-factor.service';
import { EmailVerificationService } from './services/email-verification.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { TurnstileService } from './services/turnstile.service';
import { TurnstileGuard } from './guards/turnstile.guard';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    NestConfigModule.forFeature(authConfig),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    QueueModule.forRoot(),
    OutboxModule.forRoot(),
    CacheModule.forRoot(),
    AuthLibModule,
    IdempotencyModule.forRoot(),
  ],
  controllers: [AuthPublicController],
  providers: [
    AuthService,
    RegistrationService,
    LoginService,
    TokenService,
    PasswordService,
    TwoFactorService,
    EmailVerificationService,
    AccountLockoutService,
    TurnstileService,
    TurnstileGuard,
  ],
  exports: [TurnstileService],
})
export class AppModule {}
