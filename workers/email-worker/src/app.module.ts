import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';

import { CacheModule } from '@nestlancer/cache';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule } from '@nestlancer/database';
import { LoggerModule } from '@nestlancer/logger';
import { MailModule } from '@nestlancer/mail';
import { MetricsModule } from '@nestlancer/metrics';
import { QueueModule } from '@nestlancer/queue';
import { TracingModule } from '@nestlancer/tracing';

import { emailWorkerConfig } from './config/email-worker.config';
import { EmailConsumer } from './consumers/email.consumer';
import { EmailDispatcherService } from './services/email-dispatcher.service';
import { EmailRecipientResolverService } from './services/email-recipient-resolver.service';
import { EmailRendererService } from './services/email-renderer.service';
import { EmailRetryService } from './services/email-retry.service';
import { EmailWorkerService } from './services/email-worker.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    NestConfigModule.forFeature(emailWorkerConfig),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    QueueModule.forRoot(),
    DatabaseModule.forRoot(),
    MailModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        provider: configService.get('emailWorker.provider'),
        smtp: configService.get('emailWorker.smtp'),
        zeptomail: {
          token: configService.get('emailWorker.zeptomail.token'),
          smtpHost: configService.get('emailWorker.zeptomail.smtpHost'),
        },
        from: `${configService.get('emailWorker.from.name')} <${configService.get(
          'emailWorker.from.email',
        )}>`,
      }),
    }),
    CacheModule.forRoot(),
  ],
  providers: [
    EmailWorkerService,
    EmailRendererService,
    EmailRetryService,
    EmailRecipientResolverService,
    EmailDispatcherService,
    EmailConsumer,
  ],
})
export class AppModule {}
