import { ConfigService } from '@nestjs/config';
import { LoggerService, installJsonConsoleLogger } from '@nestlancer/logger';
import { NestFactory } from '@nestjs/core';

import { bootstrapMetrics } from '@nestlancer/metrics';
import { initTracing } from '@nestlancer/tracing';

import { AuditModule } from './app.module';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-worker-audit');
  const app = await NestFactory.createApplicationContext(AuditModule);

  try {
    app.useLogger(app.get(LoggerService));
  } catch {
    // LoggerModule missing
  }

  bootstrapMetrics(app);
  const logger = app.get(LoggerService);
  const configService = app.get(ConfigService);

  const workerName = 'Audit Worker';

  app.enableShutdownHooks();

  logger.log(`${workerName} is starting...`);

  // Wait for the application to be ready
  await app.init();

  logger.log(`${workerName} is running and connected to RabbitMQ.`);
}

bootstrap().catch((err) => {
  console.error('Failed to start Audit Worker', err);
  process.exit(1);
});
