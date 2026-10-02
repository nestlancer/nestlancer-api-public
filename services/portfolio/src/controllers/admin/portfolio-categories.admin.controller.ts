import { ApiStandardResponse, ApiStandardResponses, UserRole } from '@nestlancer/common';
import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { Auth } from '@nestlancer/auth-lib';
import { PortfolioCategoriesService } from '../../services/portfolio-categories.service';
import { CreateCategoryDto } from '../../dto/create-category.dto';
import { UpdateCategoryDto } from '../../dto/update-category.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CategoryResponseDto } from '../../dto/category-response.dto';

/**
 * Controller for administrative management of portfolio categories.
 */
@ApiTags('Admin/Portfolio Categories')
@ApiBearerAuth()
@Controller('admin/portfolio/categories')
@Auth(UserRole.ADMIN)
@ApiStandardResponses()
export class PortfolioCategoriesAdminController {
  constructor(private readonly categoriesService: PortfolioCategoriesService) {}

  /**
   * Retrieves a comprehensive list of all portfolio categories for administrative oversight.
   *
   * @returns A promise resolving to an array of all defined portfolio categories
   */
  @Get()
  @ApiOperation({
    summary: 'List all categories',
    description: 'Retrieve the complete registry of categories used across the portfolio system.',
  })
  @ApiStandardResponse({ type: CategoryResponseDto, isArray: true })
  async findAll() {
    return this.categoriesService.findAll();
  }

  /**
   * Registers a new classification category for portfolio organization.
   *
   * @param dto Configuration for the new category
   * @returns A promise resolving to the newly created category
   */
  @Post()
  @ApiOperation({
    summary: 'Create category',
    description: 'Define and save a new organizational category for portfolio entries.',
  })
  @ApiStandardResponse({ type: CategoryResponseDto })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  /**
   * Modifies the configuration of an existing portfolio category.
   *
   * @param id The unique identifier of the category
   * @param dto Partial configuration for updating the category
   * @returns A promise resolving to the updated category details
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update category',
    description: 'Apply changes to the metadata or display properties of a category.',
  })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiStandardResponse({ type: CategoryResponseDto })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  /**
   * Permanently removes a category from the system.
   * Optionally allows reassigning existing portfolio entries to a different category ID.
   *
   * @param id The unique identifier of the category to remove
   * @param reassignToId Optional target category ID for orphan items
   * @returns A promise confirming successful deletion and reassignment
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete category',
    description: 'Remove a classification category and handle legacy item associations.',
  })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiQuery({
    name: 'reassignToId',
    required: false,
    description: 'Target category ID for existing items',
  })
  @ApiStandardResponse({ description: 'Category successfully deleted' })
  async remove(@Param('id') id: string, @Query('reassignToId') reassignToId?: string) {
    return this.categoriesService.delete(id, reassignToId);
  }
}
