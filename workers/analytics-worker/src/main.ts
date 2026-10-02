import { NestFactory } from '@nestjs/core';
import { LoggerService, installJsonConsoleLogger } from '@nestlancer/logger';

import { bootstrapMetrics } from '@nestlancer/metrics';
import { initTracing } from '@nestlancer/tracing';

import { AppModule } from './app.module';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-worker-analytics');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    app.useLogger(app.get(LoggerService));
  } catch {
    // LoggerModule missing
  }

  bootstrapMetrics(app);
  const logger = app.get(LoggerService);

  logger.log('Analytics Worker started');

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received. Cleaning up...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
