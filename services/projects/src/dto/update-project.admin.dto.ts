import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Administrative DTO for updating core project details.
 */
export class UpdateProjectAdminDto {
  @ApiPropertyOptional({
    description: 'The title of the project',
    example: 'Refactored Website Backend',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'The detailed scope of the project',
    example: 'Refactoring the entire backend to use NestJS.',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
