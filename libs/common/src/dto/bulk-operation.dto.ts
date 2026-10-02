import { IsArray, IsString, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Bulk operation request DTO */
export class BulkOperationDto {
  @ApiProperty({ description: 'Array of resource IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  ids!: string[];
}
