import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaRootController } from './media-root.controller';
import { MediaAdminController } from './media.admin.controller';
import { MediaService } from './media.service';
import { MediaAdminService } from './media-admin.service';
import { AdminMediaReferencesService } from './media-admin-references.service';
import { MediaAdminPublicScopeService } from './media-admin-public-scope.service';
import { MediaProcessingService } from './media-processing.service';
import { ChunkedUploadController } from './chunked-upload.controller';
import { ChunkedUploadService } from './chunked-upload.service';
import { MediaAccessService } from './media-access.service';
import { MediaLibraryScopeService } from './media-library-scope.service';
import { MediaPortfolioPromoteService } from './media-portfolio-promote.service';
import { ShareModule } from '../share/share.module';
import { StorageModule } from '../storage/storage.module';
import { DatabaseModule } from '@nestlancer/database';
import { QueueModule } from '@nestlancer/queue';
import { CacheModule } from '@nestlancer/cache';
import { OutboxModule } from '@nestlancer/outbox';

@Module({
  imports: [
    ShareModule,
    StorageModule,
    DatabaseModule,
    QueueModule,
    CacheModule,
    OutboxModule.forRoot(),
  ],
  controllers: [
    MediaRootController,
    MediaController,
    MediaAdminController,
    ChunkedUploadController,
  ],
  providers: [
    MediaService,
    MediaAdminService,
    AdminMediaReferencesService,
    MediaAdminPublicScopeService,
    MediaProcessingService,
    ChunkedUploadService,
    MediaAccessService,
    MediaLibraryScopeService,
    MediaPortfolioPromoteService,
  ],
  exports: [MediaService, MediaProcessingService, MediaAccessService],
})
export class MediaModule {}
