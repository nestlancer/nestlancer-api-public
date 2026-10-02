import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuotePrefillDto {
  @ApiProperty({ description: 'Source quote UUID to copy structure from' })
  @IsString()
  @IsNotEmpty()
  sourceQuoteId: string;
}
