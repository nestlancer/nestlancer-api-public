import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsService } from './metrics.service';
import { HttpMetricsCollector } from './collectors/http.collector';
import { CacheMetricsCollector } from './collectors/cache.collector';
import { DatabaseMetricsCollector } from './collectors/database.collector';
import { QueueMetricsCollector } from './collectors/queue.collector';
import { CustomMetricsCollector } from './collectors/custom.collector';
import { MetricsInterceptor } from './interceptors/metrics.interceptor';

@Global()
@Module({
  providers: [
    MetricsService,
    HttpMetricsCollector,
    CacheMetricsCollector,
    DatabaseMetricsCollector,
    QueueMetricsCollector,
    CustomMetricsCollector,
    MetricsInterceptor,
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
  exports: [
    MetricsService,
    HttpMetricsCollector,
    CacheMetricsCollector,
    DatabaseMetricsCollector,
    QueueMetricsCollector,
    CustomMetricsCollector,
    MetricsInterceptor,
  ],
})
export class MetricsModule {}
