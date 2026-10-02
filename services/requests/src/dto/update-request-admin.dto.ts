import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Trim } from '@nestlancer/common';

/**
 * Allowlist for PATCH /admin/requests/:id.
 * Status, assignee, owner, and timestamps stay on dedicated endpoints.
 */
export class UpdateRequestAdminDto {
  @ApiPropertyOptional({ minLength: 5, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  @Trim()
  title?: string;

  @ApiPropertyOptional({ minLength: 20, maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  @Trim()
  description?: string;

  @ApiPropertyOptional({
    enum: [
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
    ],
  })
  @IsOptional()
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
  category?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Trim()
  additionalInfo?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Trim()
  timeframe?: string;
}
