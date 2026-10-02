import { Module } from '@nestjs/common';

import { AuthLibModule } from '@nestlancer/auth-lib';
import { CacheModule } from '@nestlancer/cache';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule } from '@nestlancer/database';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { OutboxModule } from '@nestlancer/outbox';
import { QueueModule } from '@nestlancer/queue';
import { TracingModule } from '@nestlancer/tracing';
import { TurnstileModule } from '@nestlancer/turnstile';

import { ContactAdminController } from './controllers/admin/contact.admin.controller';
import { ContactPublicController } from './controllers/public/contact.public.controller';
import { ContactAdminService } from './services/contact-admin.service';
import { ContactResponseService } from './services/contact-response.service';
import { ContactSubmissionService } from './services/contact-submission.service';
import { ContactService } from './services/contact.service';
import { SpamFilterService } from './services/spam-filter.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    CacheModule.forRoot(),
    QueueModule.forRoot(),
    OutboxModule.forRoot(),
    AuthLibModule,
    TurnstileModule.forRoot(),
  ],
  controllers: [ContactPublicController, ContactAdminController],
  providers: [
    ContactService,
    ContactSubmissionService,
    ContactResponseService,
    SpamFilterService,
    ContactAdminService,
  ],
})
export class AppModule {}
