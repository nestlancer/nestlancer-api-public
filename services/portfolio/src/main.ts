import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from '@nestlancer/common';
import { ConfigService } from '@nestjs/config';
import { initTracing, installHttpObservability } from '@nestlancer/tracing';
import { bootstrapMetrics } from '@nestlancer/metrics';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-svc-portfolio');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  try {
    const logger = app.get(LoggerService);
    app.useLogger(logger);
  } catch {
    // LoggerModule not registered — JSON override still covers Nest Logger calls.
  }
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get('CORS_ORIGIN') || '*',
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nestlancer Portfolio Service')
    .setDescription('Portfolio showcase API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get<number>('PORTFOLIO_SERVICE_PORT') || 3013;
  installHttpObservability(app);

  await app.listen(port);
  bootstrapMetrics(app);
  console.log(`Portfolio service is running on: ${await app.getUrl()}`);
}
bootstrap();
