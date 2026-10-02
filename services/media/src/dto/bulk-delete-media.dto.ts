import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class BulkDeleteMediaDto {
  @ApiProperty({ type: [String], description: 'Media IDs to delete' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('7', { each: true })
  ids: string[];

  @ApiPropertyOptional({ description: 'Delete even when references exist' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
