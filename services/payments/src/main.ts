import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { initTracing, installHttpObservability } from '@nestlancer/tracing';
import { bootstrapMetrics } from '@nestlancer/metrics';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-svc-payments');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  try {
    const logger = app.get(LoggerService);
    app.useLogger(logger);
  } catch {
    // LoggerModule not registered — JSON override still covers Nest Logger calls.
  }

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Nestlancer Payments Service')
    .setDescription('The Nestlancer Payments Service API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.enableCors();

  const port = process.env.PAYMENTS_SERVICE_PORT || 3003; // Payments service port
  installHttpObservability(app);

  await app.listen(port);
  bootstrapMetrics(app);
  console.log(`Payments service listening on port ${port}`);
}

bootstrap();
