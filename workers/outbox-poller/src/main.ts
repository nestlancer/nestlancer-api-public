import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { bootstrapMetrics } from '@nestlancer/metrics';
import { initTracing } from '@nestlancer/tracing';

import { AppModule } from './app.module';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-worker-outbox');
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    app.useLogger(app.get(LoggerService));
  } catch {
    // LoggerModule missing
  }

  bootstrapMetrics(app);

  app.enableShutdownHooks();
  logger.log('Outbox Poller Worker is running');
}

bootstrap();
