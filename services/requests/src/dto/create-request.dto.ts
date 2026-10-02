import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDefined,
  MaxLength,
  MinLength,
  IsIn,
  ValidateNested,
  IsNumber,
  Min,
  IsBoolean,
  IsArray,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Trim } from '@nestlancer/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Budget constraints for the requested project.
 */
class BudgetDto {
  @ApiProperty({
    description: 'Minimum estimated budget in rupees (major units). Stored as paise server-side.',
    example: 5000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  min: number;

  @ApiProperty({
    description: 'Maximum estimated budget in rupees (major units). Stored as paise server-side.',
    example: 15000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  max: number;

  @ApiProperty({ description: 'ISO currency code for the budget', example: 'INR', maxLength: 3 })
  @IsString()
  @MaxLength(3)
  currency: string;

  @ApiProperty({ description: 'Whether the budget is open to negotiation', example: true })
  @IsBoolean()
  flexible: boolean;
}

/**
 * Expected timeline for project execution.
 */
class TimelineDto {
  @ApiProperty({ description: 'Preferred project kickoff date', example: '2024-12-01T00:00:00Z' })
  @IsString()
  @IsNotEmpty()
  preferredStartDate: string; // ISO Date string

  @ApiProperty({
    description: 'Target date for project completion',
    example: '2025-05-01T23:59:59Z',
  })
  @IsString()
  @IsNotEmpty()
  deadline: string; // ISO Date string

  @ApiProperty({ description: 'Whether the project deadlines are flexible', example: false })
  @IsBoolean()
  flexible: boolean;
}

/**
 * Specific technical requirements or preferences.
 */
class TechnicalRequirementsDto {
  @ApiPropertyOptional({
    description: 'Preferred technology stack or languages',
    example: ['NestJS', 'React', 'PostgreSQL'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredTechnologies?: string[];

  @ApiPropertyOptional({
    description: 'Hosting or infrastructure preferences',
    example: 'AWS / Vercel',
  })
  @IsString()
  @IsOptional()
  hosting?: string;

  @ApiPropertyOptional({
    description: 'Third-party APIs or services to integrate',
    example: ['Stripe', 'SendGrid', 'OpenAI'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  integrations?: string[];
}

/**
 * Service category types for new project requests.
 */
export enum ProjectRequestCategory {
  WEB_DEV = 'webDevelopment',
  MOBILE_APP = 'mobileApp',
  ECOMMERCE = 'ecommerce',
  DESIGN = 'design',
  BRANDING = 'branding',
  MARKETING = 'marketing',
  SEO = 'seo',
  CONSULTING = 'consulting',
  MAINTENANCE = 'maintenance',
  CUSTOM = 'custom',
}

/**
 * DTO for creating a new project service request.
 */
export class CreateRequestDto {
  @ApiProperty({
    description: 'Succinct and descriptive title for the request',
    example: 'Build a Custom CRM for Real Estate',
    minLength: 5,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(100)
  @Trim()
  title: string;

  @ApiProperty({
    description: 'Detailed explanation of the project scope and requirements',
    example:
      'We need a robust CRM system to manage lead flow, automated emails, and agent performance tracking...',
    minLength: 20,
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(5000)
  @Trim()
  description: string;

  @ApiProperty({
    description: 'The primary service category for this request',
    enum: ProjectRequestCategory,
    example: ProjectRequestCategory.WEB_DEV,
  })
  @IsString()
  @IsIn([
    'webDevelopment',
    'mobileApp',
    'ecommerce',
    'design',
    'branding',
    'marketing',
    'seo',
    'consulting',
    'maintenance',
    'custom',
  ])
  category: string;

  @ApiProperty({ description: 'Financial constraints and configuration', type: BudgetDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => BudgetDto)
  budget: BudgetDto;

  @ApiProperty({ description: 'Project timing and flexibility requirements', type: TimelineDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => TimelineDto)
  timeline: TimelineDto;

  @ApiProperty({
    description: 'Specific functional or business requirements',
    example: ['User authentication', 'Dashboard analytics', 'PDF reporting'],
    maxItems: 20,
    type: [String],
  })
  @IsDefined()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  requirements: string[];

  @ApiPropertyOptional({
    description: 'Technical stack and infra preferences',
    type: TechnicalRequirementsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TechnicalRequirementsDto)
  technicalRequirements?: TechnicalRequirementsDto;

  @ApiPropertyOptional({
    description:
      'Array of media/file UUIDs for any supporting documentation provided by the client',
    example: ['550e8400-e29b-41d4-a716-446655440003'],
    maxItems: 10,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  attachments?: string[];

  @ApiPropertyOptional({
    description:
      'Any other relevant information not captured in the description or technical requirements',
    example: 'We prefer a phased rollout with the MVP being ready by Q1.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Trim()
  additionalInfo?: string;

  @ApiPropertyOptional({ description: 'Published portfolio item that inspired this request' })
  @IsOptional()
  @IsString()
  referencePortfolioItemId?: string;

  @ApiPropertyOptional({
    description: 'Optional service catalog package this request is based on',
    example: '550e8400-e29b-41d4-a716-446655440099',
  })
  @IsOptional()
  @IsUUID()
  servicePackageId?: string;
}
