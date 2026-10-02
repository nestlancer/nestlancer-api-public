import { Test, TestingModule } from '@nestjs/testing';
import {
  BlogCategoriesPublicController,
  BlogTagsPublicController,
  AuthorsPublicController,
} from '../../../../src/controllers/public/taxonomy.public.controller';
import { CategoriesService } from '../../../../src/services/categories.service';
import { TagsService } from '../../../../src/services/tags.service';
import { AuthorsService } from '../../../../src/services/authors.service';
import { PrismaReadService } from '@nestlancer/database';

describe('BlogCategoriesPublicController', () => {
  let controller: BlogCategoriesPublicController;
  let service: jest.Mocked<CategoriesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogCategoriesPublicController],
      providers: [
        {
          provide: CategoriesService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    controller = module.get<BlogCategoriesPublicController>(BlogCategoriesPublicController);
    service = module.get(CategoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findAll', async () => {
    service.findAll.mockResolvedValue([]);
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });
});

describe('BlogTagsPublicController', () => {
  let controller: BlogTagsPublicController;
  let service: jest.Mocked<TagsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlogTagsPublicController],
      providers: [
        {
          provide: TagsService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    controller = module.get<BlogTagsPublicController>(BlogTagsPublicController);
    service = module.get(TagsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findAll', async () => {
    service.findAll.mockResolvedValue([]);
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });
});

describe('AuthorsPublicController', () => {
  let controller: AuthorsPublicController;
  let service: jest.Mocked<AuthorsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthorsPublicController],
      providers: [
        {
          provide: AuthorsService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        { provide: PrismaReadService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthorsPublicController>(AuthorsPublicController);
    service = module.get(AuthorsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findAll', async () => {
    service.findAll.mockResolvedValue([]);
    await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
  });
});
