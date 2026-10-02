import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PostsService } from './services/posts.service';
import { PostFeaturedImageService } from './services/post-featured-image.service';
import { CategoriesService } from './services/categories.service';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import {
  AllExceptionsFilter,
  HttpExceptionFilter,
  TransformResponseInterceptor,
} from '@nestlancer/common';
import { ConfigService } from '@nestjs/config';
import { initTracing, installHttpObservability } from '@nestlancer/tracing';
import { bootstrapMetrics } from '@nestlancer/metrics';
import { installJsonConsoleLogger, LoggerService } from '@nestlancer/logger';

async function bootstrap() {
  installJsonConsoleLogger();

  await initTracing(process.env.OTEL_SERVICE_NAME || 'nl-svc-blog');

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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Nestlancer Blog Service')
    .setDescription('Blog management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = configService.get<number>('BLOG_SERVICE_PORT') || 3014;
  installHttpObservability(app);

  const warmStarted = Date.now();
  await Promise.all([
    app.get(PostsService).onModuleInit(),
    app.get(PostFeaturedImageService).onModuleInit(),
    app.get(CategoriesService).onModuleInit(),
  ]);
  console.log(`blog read pools warm in ${Date.now() - warmStarted}ms`);

  await app.listen(port);
  bootstrapMetrics(app);
  console.log(`Blog service is running on: ${await app.getUrl()}`);
}
bootstrap();
