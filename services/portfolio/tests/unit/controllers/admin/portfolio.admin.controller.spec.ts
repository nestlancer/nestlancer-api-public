import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PortfolioAdminController } from '../../../../src/controllers/admin/portfolio.admin.controller';
import { PortfolioAdminService } from '../../../../src/services/portfolio-admin.service';
import { PortfolioAnalyticsService } from '../../../../src/services/portfolio-analytics.service';
import { PortfolioOrderingService } from '../../../../src/services/portfolio-ordering.service';
import { PortfolioService } from '../../../../src/services/portfolio.service';
import { PortfolioMediaService } from '../../../../src/services/portfolio-media.service';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('PortfolioAdminController', () => {
  let controller: PortfolioAdminController;
  let adminService: jest.Mocked<PortfolioAdminService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioAdminController],
      providers: [
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
            getAllAndMerge: jest.fn(),
          },
        },
        {
          provide: PortfolioAdminService,
          useValue: {
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            publish: jest.fn(),
            unpublish: jest.fn(),
            archive: jest.fn(),
            toggleFeatured: jest.fn(),
            updatePrivacy: jest.fn(),
            duplicate: jest.fn(),
            bulkUpdate: jest.fn(),
          },
        },
        {
          provide: PortfolioAnalyticsService,
          useValue: {
            getGlobalAnalytics: jest.fn(),
            getItemAnalytics: jest.fn(),
          },
        },
        {
          provide: PortfolioOrderingService,
          useValue: {
            reorder: jest.fn(),
          },
        },
        {
          provide: PortfolioService,
          useValue: {
            create: jest.fn(),
          },
        },
        { provide: PrismaWriteService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
        {
          provide: PortfolioMediaService,
          useValue: {
            addMedia: jest.fn(),
            reorderMedia: jest.fn(),
            removeMedia: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PortfolioAdminController>(PortfolioAdminController);
    adminService = module.get(PortfolioAdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
