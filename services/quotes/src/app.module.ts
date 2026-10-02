import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { NestlancerConfigModule } from '@nestlancer/config';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { DatabaseModule } from '@nestlancer/database';
import { QueueModule } from '@nestlancer/queue';
import { OutboxModule } from '@nestlancer/outbox';
import { CacheModule } from '@nestlancer/cache';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { StorageModule } from '@nestlancer/storage';
import { DocumentsModule } from '@nestlancer/documents';
import { PdfModule } from '@nestlancer/pdf';

import { QuotesController } from './controllers/quotes.controller';
import { QuotesAdminController } from './controllers/quotes.admin.controller';
import { QuoteDocumentsController } from './controllers/documents.controller';
import { QuotesService } from './services/quotes.service';
import { QuotesAdminService } from './services/quotes.admin.service';
import { QuoteLineItemLibraryService } from './services/quote-line-item-library.service';
import { QuoteStatusService } from './services/quote-status.service';
import { QuotePdfService } from './services/quote-pdf.service';
import { ContractPdfService } from './services/contract-pdf.service';
import { QuoteStatsService } from './services/quote-stats.service';
import { QuoteExpirySchedulerService } from './services/quote-expiry-scheduler.service';
import { ProjectsProvisionerService } from './services/projects-provisioner.service';

import quotesConfig from './config/quotes.config';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    NestConfigModule.forFeature(quotesConfig),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    QueueModule.forRoot(),
    OutboxModule.forRoot(),
    CacheModule.forRoot(),
    AuthLibModule,
    StorageModule.forRoot(),
    PdfModule,
    DocumentsModule,
  ],
  controllers: [QuotesController, QuotesAdminController, QuoteDocumentsController],
  providers: [
    QuotesService,
    QuotesAdminService,
    QuoteLineItemLibraryService,
    QuoteStatusService,
    QuotePdfService,
    ContractPdfService,
    QuoteStatsService,
    QuoteExpirySchedulerService,
    ProjectsProvisionerService,
  ],
})
export class AppModule {}
