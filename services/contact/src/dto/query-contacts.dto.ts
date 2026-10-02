import { ApiPropertyOptional } from '@nestjs/swagger';

import { IsOptional, IsEnum, IsString } from 'class-validator';

import { PaginationQueryDto, ContactStatus, SortOrder } from '@nestlancer/common';

/**
 * Data Transfer Object for querying and filtering contact inquiries.
 */
export class QueryContactsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ContactStatus, description: 'Filter by inquiry status' })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @ApiPropertyOptional({ example: 'createdAt', description: 'Field to sort by' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.DESC, description: 'Sort direction' })
  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder = SortOrder.DESC;
}
