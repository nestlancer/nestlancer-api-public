import { PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as common from '@nestjs/common';

/**
 * Data Transfer Object for updating an existing category.
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
