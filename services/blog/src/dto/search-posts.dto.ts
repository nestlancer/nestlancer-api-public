import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

/**
 * Data Transfer Object for basic text-based blog search.
 */
export class SearchPostsDto {
  @ApiProperty({
    example: 'microservices',
    description: 'The search query string (minimum 2 characters, no control characters)',
  })
  @IsString()
  @MinLength(2)
  @Matches(/^[^\u0000-\u001F\u007F]+$/, {
    message: 'q must not contain control characters',
  })
  q: string;
}
