import './integration.env';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { AppModule } from '../../src/app.module';
import { PortfolioPublicController } from '../../src/controllers/public/portfolio.public.controller';
import { PortfolioAdminController } from '../../src/controllers/admin/portfolio.admin.controller';
import { PortfolioCategoriesAdminController } from '../../src/controllers/admin/portfolio-categories.admin.controller';
import { PortfolioService } from '../../src/services/portfolio.service';

function loadDevEnv() {
  const envPath = resolve(__dirname, '../../../../.env.development');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...value] = trimmed.split('=');
      if (key) {
        process.env[key.trim()] = value
          .join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    }
  });
}

describe('AppModule (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    loadDevEnv();
    process.env.NODE_ENV = 'development';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [Reflector],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should resolve public portfolio controller', () => {
    const controller = app.get(PortfolioPublicController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(PortfolioPublicController);
  });

  it('should resolve admin portfolio controllers', () => {
    const adminController = app.get(PortfolioAdminController);
    const categoriesAdminController = app.get(PortfolioCategoriesAdminController);
    expect(adminController).toBeInstanceOf(PortfolioAdminController);
    expect(categoriesAdminController).toBeInstanceOf(PortfolioCategoriesAdminController);
  });

  it('should resolve PortfolioService as dependency of portfolio controllers', () => {
    const portfolioService = app.get(PortfolioService);
    expect(portfolioService).toBeDefined();
    expect(portfolioService).toBeInstanceOf(PortfolioService);
  });
});
