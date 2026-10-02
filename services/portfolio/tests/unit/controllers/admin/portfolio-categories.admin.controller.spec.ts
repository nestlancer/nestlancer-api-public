import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PortfolioCategoriesAdminController } from '../../../../src/controllers/admin/portfolio-categories.admin.controller';
import { PortfolioCategoriesService } from '../../../../src/services/portfolio-categories.service';
import { CreateCategoryDto } from '../../../../src/dto/create-category.dto';
import { UpdateCategoryDto } from '../../../../src/dto/update-category.dto';

describe('PortfolioCategoriesAdminController', () => {
  let controller: PortfolioCategoriesAdminController;
  let categoriesService: jest.Mocked<PortfolioCategoriesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioCategoriesAdminController],
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
          provide: PortfolioCategoriesService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<PortfolioCategoriesAdminController>(PortfolioCategoriesAdminController);
    categoriesService = module.get(PortfolioCategoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call categoriesService.findAll', async () => {
      categoriesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(categoriesService.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should call categoriesService.create', async () => {
      categoriesService.create.mockResolvedValue({ id: '1' } as any);
      const dto = new CreateCategoryDto();

      const result = await controller.create(dto);

      expect(categoriesService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('update', () => {
    it('should call categoriesService.update', async () => {
      categoriesService.update.mockResolvedValue({ id: '1' } as any);
      const dto = new UpdateCategoryDto();

      const result = await controller.update('1', dto);

      expect(categoriesService.update).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('remove', () => {
    it('should call categoriesService.delete with reassignToId', async () => {
      categoriesService.delete.mockResolvedValue({ deleted: true } as any);

      const result = await controller.remove('1', '2');

      expect(categoriesService.delete).toHaveBeenCalledWith('1', '2');
      expect(result).toEqual({ deleted: true });
    });

    it('should call categoriesService.delete without reassignToId', async () => {
      categoriesService.delete.mockResolvedValue({ deleted: true } as any);

      const result = await controller.remove('1');

      expect(categoriesService.delete).toHaveBeenCalledWith('1', undefined);
      expect(result).toEqual({ deleted: true });
    });
  });
});
