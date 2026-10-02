import { IsOptional, IsString, IsNotEmpty, Allow } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DuplicateQuoteDto {
  @ApiPropertyOptional({
    description:
      'When set, copies line items onto this existing request (must not already have a quote). ' +
      'Omit to clone as a new DRAFT request (legacy — prefer POST /admin/requests/:id/quotes/prefill).',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  targetRequestId?: string;

  /** Accepted aliases / ignored fields so exploratory bodies do not 400 (NL-QUOTE-004). */
  @ApiPropertyOptional({ deprecated: true, description: 'Ignored alias' })
  @Allow()
  @IsOptional()
  sourceQuoteId?: string;

  @ApiPropertyOptional({ deprecated: true, description: 'Ignored alias' })
  @Allow()
  @IsOptional()
  quoteId?: string;

  @ApiPropertyOptional({ deprecated: true, description: 'Ignored alias' })
  @Allow()
  @IsOptional()
  duplicateFrom?: string;

  @ApiPropertyOptional({ deprecated: true, description: 'Ignored — title is copied from source' })
  @Allow()
  @IsOptional()
  title?: string;
}
