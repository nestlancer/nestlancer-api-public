import { z } from 'zod';

export const observabilityConfigSchema = z.object({
  TRACING_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  JAEGER_OTLP_URL: z.string().optional(),
  JAEGER_URL: z.string().optional(),
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
  OTEL_TRACES_SAMPLER: z.string().optional(),
  OTEL_TRACES_SAMPLER_ARG: z.string().optional(),
  METRICS_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v !== 'false'),
  METRICS_PORT: z.coerce.number().default(9464),
  METRICS_BIND_HOST: z.string().default('0.0.0.0'),
  LOKI_PUSH_URL: z.string().optional(),
  LOKI_USERNAME: z.string().optional(),
  LOKI_PASSWORD: z.string().optional(),
  PROMETHEUS_URL: z.string().optional(),
  APP_METRICS_TARGETS: z.string().optional(),
  APP_VPS_HOST: z.string().optional(),
});

export type ObservabilityConfig = z.infer<typeof observabilityConfigSchema>;
