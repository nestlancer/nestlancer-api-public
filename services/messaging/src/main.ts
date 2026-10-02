import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  TransformResponseInterceptor,
} from '@nestlancer/common';
import { AppModule } from './app.module';
import { initTracing, installHttpObservability } from '@nestlancer/tracing';
import { bootstrapMetrics } from '@nestlancer/metrics';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-svc-messaging');

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

  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Nestlancer Messaging Service')
    .setDescription('The Nestlancer Messaging Service API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app as any, config);
  SwaggerModule.setup('docs', app as any, document);

  app.enableCors();

  const port = process.env.MESSAGING_SERVICE_PORT || 3010; // Messaging service port
  installHttpObservability(app);

  await app.listen(port);
  bootstrapMetrics(app);
  console.log(`Messaging service listening on port ${port}`);
}

bootstrap();
