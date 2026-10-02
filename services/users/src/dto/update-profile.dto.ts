import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Trim } from '@nestlancer/common';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a user's core profile information.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: "User's first name",
    example: 'John',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Trim()
  firstName?: string;

  @ApiPropertyOptional({
    description: "User's last name",
    example: 'Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Trim()
  lastName?: string;

  @ApiPropertyOptional({
    description: "User's phone number in E.164 format",
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Phone number must be a valid E.164 format' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Short professional tagline shown on the public profile',
    example: 'Full-stack developer',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Trim()
  headline?: string;

  @ApiPropertyOptional({
    description: 'Longer profile bio',
    example: 'I build payment systems for SaaS.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Trim()
  bio?: string;

  @ApiPropertyOptional({
    description: 'Skills or expertise tags',
    example: ['React', 'NestJS'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  @ArrayMaxSize(30)
  skills?: string[];

  @ApiPropertyOptional({ description: "User's preferred timezone", example: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'User preferred language (ISO 639-1)',
    example: 'en',
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  language?: string;

  @ApiPropertyOptional({
    description: 'User country (ISO 3166-1 alpha-2)',
    example: 'US',
    maxLength: 2,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;
}
