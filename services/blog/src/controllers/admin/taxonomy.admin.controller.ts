import { ApiStandardResponses, UserRole } from '@nestlancer/common';
import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { Auth } from '@nestlancer/auth-lib';
import { CategoriesService } from '../../services/categories.service';
import { TagsService } from '../../services/tags.service';
import { AuthorsService } from '../../services/authors.service';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateTagDto,
  UpdateTagDto,
  MergeTagsDto,
} from '../../dto/create-category.dto';

import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Administrative controller for managing blog categories.
 * Provides endpoints for creating, updating, and deleting categories.
 *
 * @category Blog
 */
@ApiTags('Blog - Admin Categories')
@ApiBearerAuth()
@Controller('admin/blog/categories')
@Auth(UserRole.ADMIN)
@ApiStandardResponses()
export class BlogCategoriesAdminController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Retrieves all blog categories for administration.
   *
   * @returns Array of blog category metadata
   */
  @Get()
  @ApiOperation({
    summary: 'List all categories',
    description: 'Fetch all blog categories including their internal metadata.',
  })
  async findAll(): Promise<any> {
    return this.categoriesService.findAll();
  }

  /**
   * Creates a new blog category.
   *
   * @param dto Category creation data
   * @returns The created category metadata
   */
  @Post()
  @ApiOperation({
    summary: 'Create category',
    description: 'Define a new organizational category for blog posts.',
  })
  async create(@Body() dto: CreateCategoryDto): Promise<any> {
    return this.categoriesService.create({
      name: dto.name,
      slug: dto.slug?.trim() || slugify(dto.name),
      description: dto.description,
    });
  }

  /**
   * Updates an existing blog category.
   *
   * @param id The unique identifier of the category
   * @param dto Updated category data
   * @returns The updated category metadata
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update category',
    description: 'Modify the name, slug, or description of an existing category.',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Promise<any> {
    return this.categoriesService.update(id, {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
    });
  }

  /**
   * Deletes a blog category.
   *
   * @param id The unique identifier of the category
   * @returns Confirmation of deletion
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete category',
    description: 'Remove a blog category from the system.',
  })
  async remove(@Param('id') id: string): Promise<any> {
    return this.categoriesService.remove(id);
  }
}

/**
 * Administrative controller for managing blog tags.
 * Provides endpoints for creating, updating, deleting, and merging tags.
 *
 * @category Blog
 */
@ApiTags('Blog - Admin Tags')
@ApiBearerAuth()
@Controller('admin/blog/tags')
@Auth(UserRole.ADMIN)
@ApiStandardResponses()
export class BlogTagsAdminController {
  constructor(private readonly tagsService: TagsService) {}

  /**
   * Retrieves all blog tags for administration.
   *
   * @returns Array of blog tag metadata
   */
  @Get()
  @ApiOperation({
    summary: 'List all tags',
    description: 'Fetch all blog tags used across the system.',
  })
  async findAll(): Promise<any> {
    return this.tagsService.findAll();
  }

  /**
   * Creates a new blog tag manually.
   *
   * @param dto Tag creation data
   * @returns The created tag metadata
   */
  @Post()
  @ApiOperation({
    summary: 'Create tag',
    description: 'Define a new blog tag for content categorization.',
  })
  async create(@Body() dto: CreateTagDto): Promise<any> {
    return this.tagsService.create({
      name: dto.name,
      slug: dto.slug?.trim() || slugify(dto.name),
    });
  }

  /**
   * Updates an existing blog tag.
   *
   * @param id The unique identifier of the tag
   * @param dto Updated tag data
   * @returns The updated tag metadata
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update tag',
    description: 'Modify the name or slug of an existing blog tag.',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateTagDto): Promise<any> {
    return this.tagsService.update(id, {
      name: dto.name,
      slug: slugify(dto.name),
    });
  }

  /**
   * Deletes a blog tag.
   *
   * @param id The unique identifier of the tag
   * @returns Confirmation of deletion
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete tag', description: 'Remove a blog tag from the system.' })
  async remove(@Param('id') id: string): Promise<any> {
    return this.tagsService.remove(id);
  }

  /**
   * Merges one or more tags into a single target tag.
   *
   * @param dto Tag merge configuration
   * @returns Confirmation of the merge operation
   */
  @Post('merge')
  @ApiOperation({
    summary: 'Merge tags',
    description: 'Consolidate multiple tags into one and update all associated blog posts.',
  })
  async merge(@Body() dto: MergeTagsDto): Promise<any> {
    return this.tagsService.merge(dto.fromTagId, dto.toTagId);
  }
}

/**
 * Administrative controller for managing blog authors and their permissions.
 *
 * @category Blog
 */
@ApiTags('Blog - Admin Authors')
@ApiBearerAuth()
@Controller('admin/blog/authors')
@Auth(UserRole.ADMIN)
@ApiStandardResponses()
export class BlogAuthorsAdminController {
  constructor(private readonly authorsService: AuthorsService) {}

  /**
   * Retrieves all blog authors for administration.
   *
   * @returns Array of blog author metadata
   */
  @Get()
  @ApiOperation({
    summary: 'List all authors',
    description: 'Fetch all blog authors and their associated metadata for management.',
  })
  async findAll(): Promise<any> {
    const authors = await this.authorsService.findAll();
    return { data: authors };
  }
}
