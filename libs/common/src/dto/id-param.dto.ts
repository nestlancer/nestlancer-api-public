import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Standard ID parameter DTO */
export class IdParamDto {
  @ApiProperty({ description: 'Resource ID' })
  @IsString()
  @IsNotEmpty()
  id!: string;
}
