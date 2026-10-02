import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule } from '@nestlancer/database';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { CacheModule } from '@nestlancer/cache';
import { SearchModule } from '@nestlancer/search';
import portfolioConfig from './config/portfolio.config';
import { CacheInterceptor } from '@nestlancer/middleware';
import { PortfolioPublicController } from './controllers/public/portfolio.public.controller';
import { PortfolioAdminController } from './controllers/admin/portfolio.admin.controller';
import { PortfolioCategoriesAdminController } from './controllers/admin/portfolio-categories.admin.controller';
import { PortfolioService } from './services/portfolio.service';
import { PortfolioCategoriesService } from './services/portfolio-categories.service';
import { PortfolioSearchService } from './services/portfolio-search.service';
import { PortfolioAnalyticsService } from './services/portfolio-analytics.service';
import { PortfolioOrderingService } from './services/portfolio-ordering.service';
import { PortfolioLikesService } from './services/portfolio-likes.service';
import { PortfolioAdminService } from './services/portfolio-admin.service';
import { PortfolioPublicMapperService } from './services/portfolio-public-mapper.service';
import { PortfolioMediaService } from './services/portfolio-media.service';
import { StorageModule } from '@nestlancer/storage';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [portfolioConfig],
    }),
    NestlancerConfigModule.forRoot(),
    DatabaseModule.forRoot(),
    AuthLibModule,
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    CacheModule.forRoot(),
    SearchModule.forRoot(),
    StorageModule.forRoot(),
  ],
  controllers: [
    PortfolioPublicController,
    PortfolioCategoriesAdminController,
    PortfolioAdminController,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
    PortfolioService,
    PortfolioCategoriesService,
    PortfolioSearchService,
    PortfolioAnalyticsService,
    PortfolioOrderingService,
    PortfolioLikesService,
    PortfolioAdminService,
    PortfolioPublicMapperService,
    PortfolioMediaService,
  ],
})
export class AppModule {}
