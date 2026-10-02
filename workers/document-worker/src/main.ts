import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initTracing } from '@nestlancer/tracing';
import { bootstrapMetrics } from '@nestlancer/metrics';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-worker-document');
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    app.useLogger(app.get(LoggerService));
  } catch {
    // LoggerModule missing
  }

  bootstrapMetrics(app);
  app.enableShutdownHooks();
  console.log('Document Worker is running...');
}
bootstrap();
