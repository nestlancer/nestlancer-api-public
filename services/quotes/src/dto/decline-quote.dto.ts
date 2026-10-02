import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard reasons for declining a quote.
 */
export enum DeclineReason {
  BUDGET = 'budgetConstraints',
  TIMELINE = 'timelineIssues',
  SCOPE = 'scopeDiscrepancy',
  OTHER = 'other',
}

/**
 * DTO for declining a project quote or requesting a full re-quote.
 */
export class DeclineQuoteDto {
  @ApiProperty({
    description: 'Categorized reason for declining the quote',
    enum: DeclineReason,
    example: DeclineReason.BUDGET,
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['budgetConstraints', 'timelineIssues', 'scopeDiscrepancy', 'other'])
  reason: string;

  @ApiPropertyOptional({
    description: 'Detailed qualitative feedback for the decline action',
    example: 'The budget is higher than our quarterly allocation.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  feedback?: string;

  @ApiProperty({
    description:
      'Whether the client wants to keep the negotiation open by requesting a revised quote',
    example: true,
  })
  @IsBoolean()
  requestRevision: boolean;
}
