import { createServer, type Server } from 'http';

import type { MetricsService } from './metrics.service';

export interface MetricsServerOptions {
  port?: number;
  bindHost?: string;
}

let activeServer: Server | null = null;

export function startMetricsServer(
  metricsService: MetricsService,
  options: MetricsServerOptions = {},
): Server | null {
  if (process.env.METRICS_ENABLED === 'false') {
    return null;
  }

  const port = options.port ?? Number(process.env.METRICS_PORT || 9464);
  const bindHost = options.bindHost ?? process.env.METRICS_BIND_HOST ?? '127.0.0.1';

  if (activeServer) {
    return activeServer;
  }

  const server = createServer(async (req, res) => {
    if (req.url !== '/metrics' || req.method !== 'GET') {
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }

    try {
      const body = await metricsService.getMetrics();
      res.statusCode = 200;
      res.setHeader('Content-Type', metricsService.getContentType());
      res.end(body);
    } catch (err) {
      res.statusCode = 500;
      res.end(err instanceof Error ? err.message : 'Metrics error');
    }
  });

  server.listen(port, bindHost, () => {
    const service = process.env.OTEL_SERVICE_NAME || 'nestlancer';
    console.log(
      JSON.stringify({
        level: 'info',
        message: `Prometheus metrics listening on ${bindHost}:${port}/metrics`,
        context: 'MetricsServer',
        service,
        timestamp: new Date().toISOString(),
      }),
    );
  });

  activeServer = server;
  return server;
}

export async function stopMetricsServer(): Promise<void> {
  if (!activeServer) return;
  await new Promise<void>((resolve, reject) => {
    activeServer!.close((err) => (err ? reject(err) : resolve()));
  });
  activeServer = null;
}
