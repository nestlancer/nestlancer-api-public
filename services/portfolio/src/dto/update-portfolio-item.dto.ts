import { PartialType } from '@nestjs/swagger';
import { CreatePortfolioItemDto } from './create-portfolio-item.dto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as common from '@nestjs/common';

/**
 * Data Transfer Object for updating an existing portfolio item.
 */
export class UpdatePortfolioItemDto extends PartialType(CreatePortfolioItemDto) {}
