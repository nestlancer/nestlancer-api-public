import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class TemplateRequestDto {
  @ApiProperty({ example: 'E-commerce MVP rebuild' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Rebuild storefront with new checkout flow.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ example: 'web-development' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;
}

export class TemplateQuoteLineItemDto {
  @ApiProperty({ example: 'UI design & implementation' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price in major currency units (e.g. rupees)', example: 5000 })
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class TemplateQuoteDto {
  @ApiProperty({ example: 'E-commerce MVP — Phase 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Scope covers design, build, and QA.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ApiPropertyOptional({ type: [TemplateQuoteLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateQuoteLineItemDto)
  items?: TemplateQuoteLineItemDto[];

  @ApiPropertyOptional({ example: 18, minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercentage?: number;

  @ApiPropertyOptional({ example: 'INR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ example: '2026-07-01T23:59:59.000Z' })
  @IsString()
  @IsNotEmpty()
  validUntil: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  termsAndConditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Optional scope JSON copied from source' })
  @IsOptional()
  scope?: unknown;

  @ApiPropertyOptional({ description: 'Optional technical details JSON' })
  @IsOptional()
  technicalDetails?: unknown;
}

export class TemplateMilestoneDto {
  @ApiProperty({ example: 'Design sign-off' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Amount in paise', example: 250000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @ApiPropertyOptional({ example: '2026-05-15' })
  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class TemplateProjectMetaDto {
  @ApiPropertyOptional({ example: '2026-08-01' })
  @IsOptional()
  @IsString()
  targetEndDate?: string;
}

/**
 * Admin creates a similar engagement from an existing project template.
 * Default lifecycle creates Request + Quote (DRAFT) only — project after client accepts.
 */
export class DuplicateFromTemplateDto {
  @ApiProperty({ description: 'Source project UUID used as template' })
  @IsString()
  @IsNotEmpty()
  sourceProjectId: string;

  @ApiProperty({
    description: 'Target client user id',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiPropertyOptional({ description: 'Assigned admin / operator user id' })
  @IsOptional()
  @IsString()
  adminId?: string;

  @ApiPropertyOptional({
    enum: ['quote_draft'],
    default: 'quote_draft',
    description: 'Only quote_draft is supported in v1 (client must approve quote)',
  })
  @IsOptional()
  @IsIn(['quote_draft'])
  lifecycle?: 'quote_draft';

  @ApiProperty({ type: TemplateRequestDto })
  @ValidateNested()
  @Type(() => TemplateRequestDto)
  request: TemplateRequestDto;

  @ApiProperty({ type: TemplateQuoteDto })
  @ValidateNested()
  @Type(() => TemplateQuoteDto)
  quote: TemplateQuoteDto;

  @ApiPropertyOptional({ type: TemplateProjectMetaDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateProjectMetaDto)
  project?: TemplateProjectMetaDto;

  @ApiPropertyOptional({ type: [TemplateMilestoneDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => TemplateMilestoneDto)
  milestones?: TemplateMilestoneDto[];
}
