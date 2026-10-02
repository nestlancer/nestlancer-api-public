import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for formal acceptance of a project quote.
 */
export class AcceptQuoteDto {
  @ApiProperty({ description: 'Confirmed agreement to the terms and conditions', example: true })
  @IsBoolean()
  acceptTerms: boolean;

  @ApiProperty({
    description: 'Full legal name for electronic signature',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  signatureName: string;

  @ApiProperty({
    description: 'Timestamp of the electronic signature',
    example: '2024-12-31T23:59:59Z',
  })
  @IsString()
  @IsNotEmpty()
  signatureDate: string; // ISO date string

  @ApiPropertyOptional({
    description: 'Additional notes or requirements upon acceptance',
    example: 'Looking forward to working together!',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
