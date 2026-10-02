import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEmail,
  IsString,
  IsNotEmpty,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

/** Default share link lifetime when the client omits expiry (7 days). */
export const DEFAULT_SHARE_EXPIRY_SECONDS = 604800;

/** Max share link lifetime (~90 days). */
export const MAX_SHARE_EXPIRY_SECONDS = 7776000;

/**
 * Data Transfer Object for creating a shared media link.
 */
export class ShareMediaDto {
  @ApiProperty({
    example: 'Client preview for milestone 2 review',
    description:
      'Why this link exists — shown in admin and helps avoid reusing one link for everyone',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  purpose!: string;

  @ApiPropertyOptional({
    example: 604800,
    description: 'Link lifetime in seconds (required for new links; min 1 hour, max 90 days)',
  })
  @IsOptional()
  @IsNumber()
  @Min(3600)
  @Max(MAX_SHARE_EXPIRY_SECONDS)
  expiresInSeconds?: number;

  @ApiPropertyOptional({ example: false, description: 'Whether the link requires a password' })
  @IsOptional()
  @IsBoolean()
  passwordProtected?: boolean;

  @ApiPropertyOptional({ description: 'The password required to access the shared media' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({
    example: ['user@example.com'],
    description: 'List of specific emails allowed to access',
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  allowedEmails?: string[];
}
