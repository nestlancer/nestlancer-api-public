import { Logger } from '@nestjs/common';

const logger = new Logger('TracingBootstrap');

let sdk: { shutdown: () => Promise<void> } | null = null;

/**
 * OpenTelemetry NodeSDK bootstrap — exports traces to Infra Jaeger via OTLP HTTP.
 * Call before NestFactory.create() / createApplicationContext().
 */
export async function initTracing(serviceName?: string): Promise<void> {
  if (process.env.TRACING_ENABLED !== 'true') {
    logger.log('Tracing disabled (set TRACING_ENABLED=true to export to Jaeger)');
    return;
  }

  const otlpUrl =
    process.env.JAEGER_OTLP_URL ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    process.env.JAEGER_URL ||
    'http://127.0.0.1:4318/v1/traces';

  const resolvedServiceName =
    serviceName || process.env.OTEL_SERVICE_NAME || process.env.APP_NAME || 'nestlancer';

  try {
    const { NodeSDK } = await import('@opentelemetry/sdk-node');
    const { getNodeAutoInstrumentations } =
      await import('@opentelemetry/auto-instrumentations-node');
    const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
    const { Resource } = await import('@opentelemetry/resources');
    const { ATTR_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions');

    const traceExporter = new OTLPTraceExporter({ url: otlpUrl });

    const nodeSdk = new NodeSDK({
      resource: new Resource({
        [ATTR_SERVICE_NAME]: resolvedServiceName,
      }),
      traceExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
          // Presigning is local SigV4. These instrumentations still open a span
          // per signature and the exporter then waits on the collector, which
          // added a few hundred milliseconds to every cover URL.
          '@opentelemetry/instrumentation-aws-sdk': { enabled: false },
          '@opentelemetry/instrumentation-dns': { enabled: false },
          '@opentelemetry/instrumentation-net': { enabled: false },
          '@opentelemetry/instrumentation-undici': { enabled: false },
          '@opentelemetry/instrumentation-http': {
            ignoreOutgoingRequestHook: () => true,
          },
        }),
      ],
    });

    await nodeSdk.start();
    sdk = nodeSdk;
    logger.log(`Tracing enabled — exporting to ${otlpUrl} (service=${resolvedServiceName})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to start OpenTelemetry: ${message}`);
  }
}

export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
  }
}
