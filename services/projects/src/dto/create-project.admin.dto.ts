import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectAdminDto {
  @ApiProperty({
    description: 'Human-readable project title',
    example: 'Website redesign for ACME Inc.',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Identifier of the accepted quote backing this project',
    example: 'quote-uuid-here',
  })
  @IsString()
  quoteId: string;

  @ApiProperty({
    description: 'Client user id who owns this project',
    example: 'client-user-id-uuid',
  })
  @IsString()
  clientId: string;

  @ApiPropertyOptional({
    description: 'Optional longer description of the project',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional target completion date (ISO 8601 string)',
    example: '2025-12-31',
  })
  @IsOptional()
  @IsString()
  targetEndDate?: string;
}
