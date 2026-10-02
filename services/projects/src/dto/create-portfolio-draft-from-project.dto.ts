import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePortfolioDraftFromProjectDto {
  @ApiPropertyOptional({ description: 'Override title for the portfolio draft' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Portfolio category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Deliverable media IDs to promote into the portfolio gallery',
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  promoteMediaIds?: string[];
}
