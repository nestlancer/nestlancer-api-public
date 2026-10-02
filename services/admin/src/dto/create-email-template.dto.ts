import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create or upsert an email template by unique `name`.
 */
export class CreateEmailTemplateDto {
  @ApiProperty({ example: 'welcome', description: 'Unique template name' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'Welcome to Nestlancer!' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'HTML or text body (may include Handlebars placeholders)' })
  @IsString()
  body: string;

  @ApiPropertyOptional({ description: 'Declared template variables metadata' })
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
