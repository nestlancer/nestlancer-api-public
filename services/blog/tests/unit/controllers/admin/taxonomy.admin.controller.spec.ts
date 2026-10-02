import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import {
  BlogCategoriesAdminController,
  BlogTagsAdminController,
} from '../../../../src/controllers/admin/taxonomy.admin.controller';
import { CategoriesService } from '../../../../src/services/categories.service';
import { TagsService } from '../../../../src/services/tags.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateTagDto,
  UpdateTagDto,
  MergeTagsDto,
} from '../../../../src/dto/create-category.dto';

describe('BlogCategoriesAdminController', () => {
  let controller: BlogCategoriesAdminController;
  let categoriesService: jest.Mocked<CategoriesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogCategoriesAdminController],
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
          provide: CategoriesService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<BlogCategoriesAdminController>(BlogCategoriesAdminController);
    categoriesService = module.get(CategoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call categoriesService.findAll', async () => {
      categoriesService.findAll.mockResolvedValue([]);
      await controller.findAll();
      expect(categoriesService.findAll).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should call categoriesService.create with slugified name', async () => {
      const dto = { name: 'Tech' } as CreateCategoryDto;
      categoriesService.create.mockResolvedValue({
        id: 'cat-1',
        name: 'Tech',
        slug: 'tech',
        postCount: 0,
        createdAt: new Date(),
      });
      const result = await controller.create(dto);
      expect(categoriesService.create).toHaveBeenCalledWith({
        name: 'Tech',
        slug: 'tech',
        description: undefined,
      });
      expect(result).toMatchObject({ id: 'cat-1', name: 'Tech', slug: 'tech' });
    });
  });

  describe('update', () => {
    it('should call categoriesService.update', async () => {
      const dto = { name: 'Tech 2.0' } as UpdateCategoryDto;
      categoriesService.update.mockResolvedValue({
        id: '1',
        name: 'Tech 2.0',
        slug: 'tech',
        postCount: 0,
        createdAt: new Date(),
      });
      const result = await controller.update('1', dto);
      expect(categoriesService.update).toHaveBeenCalledWith('1', {
        name: 'Tech 2.0',
        slug: undefined,
        description: undefined,
      });
      expect(result).toMatchObject({ id: '1', name: 'Tech 2.0' });
    });
  });

  describe('remove', () => {
    it('should call categoriesService.remove', async () => {
      categoriesService.remove.mockResolvedValue({ deleted: true, id: '1' });
      const result = await controller.remove('1');
      expect(categoriesService.remove).toHaveBeenCalledWith('1');
      expect(result).toEqual({ deleted: true, id: '1' });
    });
  });
});

describe('BlogTagsAdminController', () => {
  let controller: BlogTagsAdminController;
  let tagsService: jest.Mocked<TagsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogTagsAdminController],
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
          provide: TagsService,
          useValue: {
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            merge: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<BlogTagsAdminController>(BlogTagsAdminController);
    tagsService = module.get(TagsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call tagsService.findAll', async () => {
      tagsService.findAll.mockResolvedValue([]);
      await controller.findAll();
      expect(tagsService.findAll).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should call tagsService.create with slugified name', async () => {
      const dto = { name: 'nestjs' } as CreateTagDto;
      tagsService.create.mockResolvedValue({
        id: 'tag-1',
        name: 'nestjs',
        slug: 'nestjs',
        postCount: 0,
        createdAt: new Date(),
      });
      const result = await controller.create(dto);
      expect(tagsService.create).toHaveBeenCalledWith({ name: 'nestjs', slug: 'nestjs' });
      expect(result).toMatchObject({ id: 'tag-1', name: 'nestjs' });
    });
  });

  describe('update', () => {
    it('should call tagsService.update', async () => {
      const dto = { name: 'nest' } as UpdateTagDto;
      tagsService.update.mockResolvedValue({
        id: '1',
        name: 'nest',
        slug: 'nest',
        postCount: 0,
        createdAt: new Date(),
      });
      const result = await controller.update('1', dto);
      expect(tagsService.update).toHaveBeenCalledWith('1', { name: 'nest', slug: 'nest' });
      expect(result).toMatchObject({ id: '1', name: 'nest' });
    });
  });

  describe('remove', () => {
    it('should call tagsService.remove', async () => {
      tagsService.remove.mockResolvedValue({ deleted: true, id: '1' });
      const result = await controller.remove('1');
      expect(tagsService.remove).toHaveBeenCalledWith('1');
      expect(result).toEqual({ deleted: true, id: '1' });
    });
  });

  describe('merge', () => {
    it('should call tagsService.merge', async () => {
      const dto = { fromTagId: '1', toTagId: '2' } as MergeTagsDto;
      tagsService.merge.mockResolvedValue({ merged: true, from: '1', to: '2' });
      const result = await controller.merge(dto);
      expect(tagsService.merge).toHaveBeenCalledWith('1', '2');
      expect(result).toEqual({ merged: true, from: '1', to: '2' });
    });
  });
});
