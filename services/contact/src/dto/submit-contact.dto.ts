import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsString,
  IsEmail,
  MaxLength,
  MinLength,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';

import { ContactSubject, Trim } from '@nestlancer/common';

/**
 * Data Transfer Object for public contact form submissions.
 * Captured from the platform's public contact interface.
 */
export class SubmitContactDto {
  @ApiProperty({
    example: 'John Doe',
    description: 'The full legal or preferred name of the person submitting the inquiry',
    maxLength: 100,
  })
  @IsString()
  @Trim()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The verified email address for receiving administrative responses',
  })
  @IsEmail()
  @Trim()
  email: string;

  @ApiProperty({
    enum: ContactSubject,
    example: ContactSubject.GENERAL,
    description: 'The primary classification or topic of the inquiry',
  })
  @IsEnum(ContactSubject)
  subject: ContactSubject;

  @ApiProperty({
    example: 'I would like to discuss a potential partnership regarding the API ecosystem.',
    description: 'The detailed textual content of the message body',
    minLength: 10,
    maxLength: 5000,
  })
  @IsString()
  @Trim()
  @MinLength(10)
  @MaxLength(5000)
  message: string;

  @ApiPropertyOptional({
    description:
      'Cloudflare Turnstile token. Required when TURNSTILE_SECRET_KEY is set in Infisical.',
  })
  @IsOptional()
  @IsString()
  turnstileToken?: string;

  @ApiPropertyOptional({ description: 'Portfolio item that inspired this inquiry' })
  @IsOptional()
  @IsUUID()
  referencePortfolioItemId?: string;
}
