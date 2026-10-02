import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { CacheModule } from '@nestlancer/cache';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule } from '@nestlancer/database';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { QueueModule } from '@nestlancer/queue';
import { StorageModule } from '@nestlancer/storage';
import { TracingModule } from '@nestlancer/tracing';

import { mediaWorkerConfig } from './config/media-worker.config';
import { MediaConsumer } from './consumers/media.consumer';
import { MediaStaleProcessingCron } from './cron/media-stale-processing.cron';
import { StorageSyncCron } from './cron/storage-sync.cron';
import { ImageResizeProcessor } from './processors/image-resize.processor';
import { MetadataExtractorProcessor } from './processors/metadata-extractor.processor';
import { ThumbnailGeneratorProcessor } from './processors/thumbnail-generator.processor';
import { VirusScanProcessor } from './processors/virus-scan.processor';
import { ImageProcessingService } from './services/image-processing.service';
import { MediaWorkerService } from './services/media-worker.service';
import { VideoProcessingService } from './services/video-processing.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [mediaWorkerConfig],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    NestlancerConfigModule.forRoot(),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    StorageModule.forRoot(),
    QueueModule.forRoot(),
    CacheModule.forRoot(),
  ],
  providers: [
    MediaConsumer,
    MediaWorkerService,
    ImageProcessingService,
    VideoProcessingService,
    VirusScanProcessor,
    ImageResizeProcessor,
    ThumbnailGeneratorProcessor,
    MetadataExtractorProcessor,
    StorageSyncCron,
    MediaStaleProcessingCron,
  ],
})
export class AppModule {}
