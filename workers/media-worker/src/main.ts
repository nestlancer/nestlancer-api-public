import { NestFactory } from '@nestjs/core';
import { LoggerService, installJsonConsoleLogger } from '@nestlancer/logger';

import { bootstrapMetrics } from '@nestlancer/metrics';
import { initTracing } from '@nestlancer/tracing';

import { AppModule } from './app.module';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-worker-media');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    app.useLogger(app.get(LoggerService));
  } catch {
    // LoggerModule missing
  }

  bootstrapMetrics(app);
  const logger = app.get(LoggerService);

  app.enableShutdownHooks();

  logger.log('Media Worker is starting...');
  await app.init();
  logger.log('Media Worker is running.');
}

bootstrap().catch((err) => {
  console.error('Failed to start Media Worker', err);
  process.exit(1);
});
