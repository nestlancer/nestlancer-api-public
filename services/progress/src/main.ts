import { NestFactory } from '@nestjs/core';
import { LoggerService, installJsonConsoleLogger } from '@nestlancer/logger';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { initTracing, installHttpObservability } from '@nestlancer/tracing';
import { bootstrapMetrics } from '@nestlancer/metrics';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-svc-progress');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(LoggerService);
  app.useLogger(logger);

  app.enableCors();

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

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PROGRESS_SERVICE_PORT', 3009);

  const config = new DocumentBuilder()
    .setTitle('Progress Service API')
    .setDescription('API documentation for the Progress service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app as any, document);

  installHttpObservability(app);


  await app.listen(port);
  bootstrapMetrics(app);
  logger.log(`Progress service is running on: http://localhost:${port}`);
}

bootstrap();
