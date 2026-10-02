import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

import { Trim } from '@nestlancer/common';

/**
 * Data Transfer Object for administrative responses to contact inquiries.
 */
export class RespondContactDto {
  @ApiPropertyOptional({
    example: 'RE: Your inquiry about services',
    description:
      'Subject line of the response email. When omitted, the service defaults to Re: <inquiry subject>.',
  })
  @IsOptional()
  @IsString()
  @Trim()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({
    example: 'Hello, thank you for reaching out...',
    description: 'The body content of the response',
  })
  @IsString()
  @Trim()
  @MaxLength(10000)
  message: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether to automatically mark the inquiry as resolved/responded',
  })
  @IsOptional()
  @IsBoolean()
  markAsResponded?: boolean = true;
}
