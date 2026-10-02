import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsUUID } from 'class-validator';

/**
 * Data Transfer Object for creating a new top-level thread comment.
 */
export class CreateCommentDto {
  @ApiProperty({
    example: 'Great article! Very helpful.',
    description: 'The body text content of the comment. Supports plain text.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'The unique identifier of the parent comment if this is a reply in a nested thread.',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

/**
 * Data Transfer Object for updating an existing comment.
 */
export class UpdateCommentDto {
  @ApiProperty({
    example: 'Updated comment content...',
    description: 'The revised body text for the comment.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

/**
 * Data Transfer Object for replying to a specifically targeted comment.
 */
export class ReplyCommentDto extends UpdateCommentDto {}

/**
 * Data Transfer Object for flagging a comment for administrative review.
 */
export class ReportCommentDto {
  @ApiProperty({
    example: 'Spam or misleading content',
    description: 'The specific reason given for reporting the comment for moderation.',
  })
  @IsString()
  @MaxLength(500)
  reason: string;
}
