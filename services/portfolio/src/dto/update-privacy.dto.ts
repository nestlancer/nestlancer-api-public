import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Visibility levels for portfolio items.
 */
export enum Visibility {
  PUBLIC = 'PUBLIC',
  UNLISTED = 'UNLISTED',
  PRIVATE = 'PRIVATE',
}

/**
 * Data Transfer Object for updating portfolio item visibility.
 */
export class UpdatePrivacyDto {
  @ApiProperty({
    enum: Visibility,
    example: Visibility.PUBLIC,
    description: 'The new visibility state',
  })
  @IsEnum(Visibility)
  visibility: Visibility;
}
