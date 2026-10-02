import { NestFactory } from '@nestjs/core';

import { bootstrapMetrics } from '@nestlancer/metrics';
import { initTracing } from '@nestlancer/tracing';

import { AppModule } from './app.module';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-worker-email');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    app.useLogger(app.get(LoggerService));
  } catch {
    // LoggerModule missing
  }

  bootstrapMetrics(app);

  // Enable graceful shutdown
  app.enableShutdownHooks();

  console.log('Email Worker is running...');
}
bootstrap();
