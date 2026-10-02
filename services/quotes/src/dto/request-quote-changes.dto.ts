import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Individual change request item within a quote negotiation.
 */
class ChangeItemDto {
  @ApiProperty({
    description: 'Specific area of the quote requiring adjustment',
    example: 'budget',
    enum: ['budget', 'timeline', 'features', 'terms'],
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  area: string; // e.g., 'budget', 'timeline', 'features'

  @ApiProperty({
    description: 'Detailed description of the requested modification',
    example: 'Reduce the total budget by 10% by removing the logo design service.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  request: string;
}

/**
 * DTO for requesting specific modifications to an issued quote.
 */
export class RequestQuoteChangesDto {
  @ApiProperty({
    description: 'List of specific points of negotiation or concern',
    type: [ChangeItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeItemDto)
  changes: ChangeItemDto[];

  @ApiPropertyOptional({
    description: 'Any additional context or summary for the requested changes',
    example: 'We are generally happy with the proposal but need to adjust the cost.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalNotes?: string;
}
