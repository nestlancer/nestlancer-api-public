import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating system-wide email communication templates.
 */
export class UpdateEmailTemplateDto {
  @ApiPropertyOptional({
    description: 'The subject line for the email template',
    example: 'Welcome to NestLancer!',
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    description: 'The HTML body content of the template (Handlebars supported)',
    example: '<h1>Hello {{name}}</h1>',
  })
  @IsOptional()
  @IsString()
  body?: string; // Handlebars HTML
}
