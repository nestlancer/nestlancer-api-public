import type { INestApplicationContext } from '@nestjs/common';

import { startMetricsServer } from './metrics-server';
import { MetricsService } from './metrics.service';

export function bootstrapMetrics(app: INestApplicationContext): void {
  const metricsService = app.get(MetricsService);
  startMetricsServer(metricsService);
}
