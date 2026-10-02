import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Subject, bufferTime, filter } from 'rxjs';

@Injectable()
export class BatchCollectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BatchCollectorService.name);
  private readonly pathSubject = new Subject<string>();
  private readonly batchWindowMs: number;
  private readonly maxBatchSize: number;
  private flushCallback!: (paths: string[]) => Promise<void>;

  constructor(private readonly configService: ConfigService) {
    this.batchWindowMs = this.configService.get<number>('cdn.batchWindowMs') || 10000;
    this.maxBatchSize = this.configService.get<number>('cdn.maxBatchSize') || 30;
  }

  onModuleInit() {
    this.pathSubject
      .pipe(
        bufferTime(this.batchWindowMs),
        filter((batch) => batch.length > 0),
      )
      .subscribe(async (batch) => {
        // Deduplicate and respect max batch size
        const uniquePaths = Array.from(new Set(batch));

        while (uniquePaths.length > 0) {
          const chunk = uniquePaths.splice(0, this.maxBatchSize);
          if (this.flushCallback) {
            try {
              await this.flushCallback(chunk);
            } catch (e: any) {
              const error = e as Error;
              this.logger.error(`Failed to flush batch: ${error.message}`, error.stack);
            }
          }
        }
      });
  }

  onModuleDestroy() {
    this.pathSubject.complete();
  }

  setFlushCallback(callback: (paths: string[]) => Promise<void>) {
    this.flushCallback = callback;
  }

  add(path: string) {
    this.pathSubject.next(path);
  }

  addBatch(paths: string[]) {
    paths.forEach((path) => this.pathSubject.next(path));
  }
}
