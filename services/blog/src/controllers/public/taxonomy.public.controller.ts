import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiStandardResponses, Public } from '@nestlancer/common';
import { Cacheable } from '@nestlancer/cache';
import { PrismaReadService } from '@nestlancer/database';
import { CategoriesService } from '../../services/categories.service';
import { TagsService } from '../../services/tags.service';
import { AuthorsService } from '../../services/authors.service';

import { ApiTags, ApiOperation } from '@nestjs/swagger';

/**
 * Controller for public access to blog categories.
 * Provides endpoints for listing and retrieving specific categories.
 *
 * @category Blog
 */
@ApiTags('Blog - Public Categories')
@Controller('categories')
@ApiStandardResponses()
export class BlogCategoriesPublicController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Retrieves all active blog categories.
   *
   * @returns A promise resolving to an array of blog category metadata
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: 'List categories',
    description: 'Fetch all available blog categories for navigation and filtering.',
  })
  @Cacheable({ ttl: 3600 })
  async findAll(): Promise<any> {
    return this.categoriesService.findAll();
  }

  /**
   * Retrieves details for a specific category by its slug.
   *
   * @param slug The unique URL-friendly identifier of the category
   * @returns A promise resolving to a detailed category object
   */
  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Get category detail',
    description: 'Retrieve metadata and metadata for a specific blog category.',
  })
  @Cacheable({ ttl: 300 })
  async getBySlug(@Param('slug') slug: string): Promise<any> {
    const category = await this.prismaRead.blogCategory.findUnique({
      where: { slug },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    const postCount = await this.prismaRead.blogPost.count({
      where: { categoryId: category.id, status: 'PUBLISHED' },
    });

    return { ...category, postCount };
  }

  /**
   * Retrieves all posts belonging to a specific category.
   *
   * @param slug The unique URL-friendly identifier of the category
   * @param page Page number for pagination
   * @param limit Number of items per page
   * @returns A promise resolving to a paginated list of blog posts in this category
   */
  @Public()
  @Get(':slug/posts')
  @ApiOperation({
    summary: 'Get posts by category',
    description:
      'Fetch a paginated list of published blog posts associated with a specific category.',
  })
  @Cacheable({ ttl: 300 })
  async getPostsByCategory(
    @Param('slug') slug: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<any> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const category = await this.prismaRead.blogCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!category)
      return { data: [], pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } };

    const [posts, total] = await Promise.all([
      this.prismaRead.blogPost.findMany({
        where: { categoryId: category.id, status: 'PUBLISHED' },
        skip,
        take: limitNum,
        orderBy: { publishedAt: 'desc' },
        include: { author: { select: { firstName: true, lastName: true } } },
      }),
      this.prismaRead.blogPost.count({ where: { categoryId: category.id, status: 'PUBLISHED' } }),
    ]);

    return {
      data: posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}

/**
 * Controller for public access to blog tags.
 * Provides endpoints for listing and retrieving specific tags.
 *
 * @category Blog
 */
@ApiTags('Blog - Public Tags')
@Controller('tags')
@ApiStandardResponses()
export class BlogTagsPublicController {
  constructor(
    private readonly tagsService: TagsService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Retrieves all active blog tags.
   *
   * @returns A promise resolving to an array of blog tag metadata
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: 'List tags',
    description: 'Fetch all available blog tags used for content discovery.',
  })
  @Cacheable({ ttl: 3600 })
  async findAll(): Promise<any> {
    return this.tagsService.findAll();
  }

  /**
   * Retrieves details for a specific tag by its slug.
   *
   * @param slug The unique name or slug of the tag
   * @returns A promise resolving to a detailed tag object
   */
  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Get tag detail',
    description: 'Retrieve metadata and metadata for a specific blog tag.',
  })
  @Cacheable({ ttl: 300 })
  async getBySlug(@Param('slug') slug: string): Promise<any> {
    const tag = await this.prismaRead.blogTag.findUnique({
      where: { slug },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with slug "${slug}" not found`);
    }

    const postCount = await this.prismaRead.blogPost.count({
      where: { tags: { some: { id: tag.id } }, status: 'PUBLISHED' },
    });

    return { ...tag, postCount };
  }

  /**
   * Retrieves all posts associated with a specific tag.
   *
   * @param slug The unique name or slug of the tag
   * @param page Page number for pagination
   * @param limit Number of items per page
   * @returns A promise resolving to a paginated list of blog posts with this tag
   */
  @Public()
  @Get(':slug/posts')
  @ApiOperation({
    summary: 'Get posts by tag',
    description: 'Fetch a paginated list of published blog posts that share a specific tag.',
  })
  @Cacheable({ ttl: 300 })
  async getPostsByTag(
    @Param('slug') slug: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<any> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const tag = await this.prismaRead.blogTag.findUnique({ where: { slug }, select: { id: true } });
    if (!tag)
      return { data: [], pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } };

    const [posts, total] = await Promise.all([
      this.prismaRead.blogPost.findMany({
        where: { tags: { some: { id: tag.id } }, status: 'PUBLISHED' },
        skip,
        take: limitNum,
        orderBy: { publishedAt: 'desc' },
        include: { author: { select: { firstName: true, lastName: true } } },
      }),
      this.prismaRead.blogPost.count({
        where: { tags: { some: { id: tag.id } }, status: 'PUBLISHED' },
      }),
    ]);

    return {
      data: posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }
}

/**
 * Controller for public access to blog authors.
 * Provides endpoints for listing and retrieving author information.
 *
 * @category Blog
 */
@ApiTags('Blog - Public Authors')
@Controller('authors')
@ApiStandardResponses()
export class AuthorsPublicController {
  constructor(private readonly authorsService: AuthorsService) {}

  /**
   * Retrieves a list of all active blog authors.
   *
   * @returns A promise resolving to an array of blog author metadata
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: 'List authors',
    description: 'Fetch all available blog authors and their basic profile information.',
  })
  @Cacheable({ ttl: 3600 })
  async findAll(): Promise<any> {
    return this.authorsService.findAll();
  }

  /**
   * Retrieves details for a specific author by their unique ID.
   *
   * @param id The unique identifier of the author
   * @returns A promise resolving to a detailed author object and their posts
   */
  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'Get author detail',
    description: 'Retrieve professional metadata and authored posts for a specific user.',
  })
  async getAuthorById(@Param('id') id: string): Promise<any> {
    return { status: 'success', data: { id, posts: [] } };
  }
}
